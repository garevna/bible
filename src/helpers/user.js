let creds = null

export function user (data) {
  if (!data) return creds
  creds = data
  window.dispatchEvent(new Event('user-changed'))
}

user.reset = function () {
  creds = null
  window.dispatchEvent(new Event('user-changed'))
}
