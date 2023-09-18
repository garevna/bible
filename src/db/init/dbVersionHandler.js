export const dbVersionHandler = (function () {
  let version = 1
  return function (value) {
    if (value) { version = value } else return version
  }
})()
