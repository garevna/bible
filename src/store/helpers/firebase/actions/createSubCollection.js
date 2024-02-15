export async function createSubCollection ({ getters }, { documentRef, subCollectionName, subCollectionDocData }) {
  await getters.createSubCollection(documentRef, subCollectionName, subCollectionDocData)
}
