import { auth } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/* ── Force session-only persistence (no localStorage token leak) ── */
setPersistence(auth, browserSessionPersistence).catch(() => {});

/* ── Redirect loop protection ── */
const REDIRECT_KEY = '_pa_rd';
const REDIRECT_WINDOW_MS = 2000;
const REDIRECT_LIMIT = 3;

function preventLoop() {
    const now = Date.now();
    const ts = parseInt(sessionStorage.getItem(REDIRECT_KEY) || '0', 10);
    const count = parseInt(sessionStorage.getItem(REDIRECT_KEY + '_c') || '0', 10);
    if (now - ts < REDIRECT_WINDOW_MS) {
        if (count >= REDIRECT_LIMIT) {
            sessionStorage.removeItem(REDIRECT_KEY);
            sessionStorage.removeItem(REDIRECT_KEY + '_c');
            return true;
        }
        sessionStorage.setItem(REDIRECT_KEY + '_c', String(count + 1));
    } else {
        sessionStorage.setItem(REDIRECT_KEY, String(now));
        sessionStorage.setItem(REDIRECT_KEY + '_c', '1');
    }
    return false;
}

function clearRedirectCount() {
    sessionStorage.removeItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY + '_c');
}

/* ── Idle session timeout ── */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
let idleTimer = null;
let lastActivity = Date.now();

function resetIdleTimer() {
    lastActivity = Date.now();
}

function getIdleTime() {
    return Date.now() - lastActivity;
}

/* ── Tab visibility lock ── */
let visibilityLock = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        visibilityLock = true;
    } else {
        if (visibilityLock) {
            visibilityLock = false;
            if (getIdleTime() > 60000) { // 1 min away = auto logout
                logoutUser();
            }
        }
    }
});

/* ── Memory wipe ── */
function wipeSession() {
    // Clear any lingering session data
    try { sessionStorage.clear(); } catch (e) {}
    // Kill idle timer
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    visibilityLock = false;
}

/* ── Token refresh with retry ── */
async function refreshToken(user) {
    try {
        return await user.getIdToken(true);
    } catch (e) {
        // Fallback: use existing token
        try { return await user.getIdToken(); } catch (e2) {
            throw new Error('Token refresh failed');
        }
    }
}

/* ── Require authenticated user (used by protected pages) ── */
export function requireAuth() {
    if (preventLoop()) {
        return Promise.reject(new Error('Redirect loop detected'));
    }

    resetIdleTimer();

    // Start idle timeout watcher
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        logoutUser();
    }, SESSION_TIMEOUT_MS);

    // Track user activity to reset idle timer
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handler = () => {
        resetIdleTimer();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => { logoutUser(); }, SESSION_TIMEOUT_MS);
        }
    };
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            // Clean up listeners
            events.forEach(e => document.removeEventListener(e, handler));
            window.location.replace('login.html');
            reject(new Error('Auth timeout'));
        }, 10000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            clearTimeout(timeout);
            unsubscribe();

            if (!user) {
                events.forEach(e => document.removeEventListener(e, handler));
                wipeSession();
                window.location.replace('login.html');
                reject(new Error('Not authenticated'));
                return;
            }

            // Verify token is fresh
            try {
                await refreshToken(user);
            } catch (e) {
                events.forEach(e => document.removeEventListener(e, handler));
                await logoutUser();
                reject(new Error('Session expired'));
                return;
            }

            clearRedirectCount();
            resolve(user);
        });
    });
}

/* ── Check if user is NOT authenticated (used by login page) ── */
export function requireNoAuth() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => { resolve(null); }, 4000);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(user);
        });
    });
}

/* ── Login with email/password ── */
export async function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

/* ── Secure logout ── */
export async function logoutUser() {
    wipeSession();
    try { await signOut(auth); } catch (e) {}
    window.location.replace('login.html');
}

/* ── Auth ready check ── */
export function onAuthReady() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}
