const USER_KEY = 'currentUser'
const ADMIN_KEY = 'adminUnlocked'

export function getUser() {
  return localStorage.getItem(USER_KEY)
}

export function setUser(name) {
  localStorage.setItem(USER_KEY, name)
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

export function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function setAdminUnlocked() {
  localStorage.setItem(ADMIN_KEY, 'true')
}
