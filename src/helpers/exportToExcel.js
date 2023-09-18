import XLSX from 'xlsx'

const initialFields = [
  { title: 'Customer creation date', prop: 'customerCreationDate', selected: true, width: 16 },
  { title: 'Customer unique code', prop: 'uniqueCode', selected: true, width: 25 },
  { title: 'Customer address', prop: 'address', selected: true, width: 45 },
  { title: 'Customer full name', prop: 'fullName', selected: true, width: 20 },
  { title: 'Customer phone (work)', prop: 'phoneWork', selected: false, width: 20 },
  { title: 'Customer phone (mobile)', prop: 'phoneMobile', selected: false, width: 20 },
  { title: 'Customer email (primary)', prop: 'primaryEmail', selected: false, width: 30 },
  { title: 'Customer email (alternative)', prop: 'alternativeEmail', selected: false, width: 30 },
  { title: 'Company name (for commercial only)', prop: 'companyName', selected: false, width: 40 },
  { title: 'Company ABN (for commercial only)', prop: 'companyAbn', selected: false, width: 20 }
]

function getCols (fields) {
  const wscols = initialFields
    .filter(field => fields.includes(field))
    .map(field => ({ width: field.width }))
  wscols.push({ width: 32 }, { width: 12 }, { width: 30 }, { width: 12 }, { width: 30 }, { width: 12 })
  return wscols
}

export function exportToExcel (data, fields) {
  const sheet = XLSX.utils.json_to_sheet(data)
  sheet['!cols'] = getCols(fields)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'customers')
  return { status: 200, route: 'customers', action: 'export', result: wb }
  // XLSX.writeFile(wb, 'customers.xlsx')
}
