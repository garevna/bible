/* eslint-disable no-extend-native */

Number.prototype.format = function () {
  return this.toString().padStart(3, '0')
}
