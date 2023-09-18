export function getValuesFromSnapshot (snapshot) {
  const fields = snapshot
    .map(record => record.docs[0]._document.data.value.mapValue.fields)
  console.log('FIELDS:\n', fields)

  const values = fields.map(user => Object.keys(user).map(key => ({ [key]: user[key].stringValue })))

  return values.map(data => data.reduce((res, item) => Object.assign(res, item), {}))
}
