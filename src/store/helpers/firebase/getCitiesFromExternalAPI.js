export async function getCitiesFromExternalAPI (country) {
  const { data } = await (await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ country })
  })).json()

  return data
}
