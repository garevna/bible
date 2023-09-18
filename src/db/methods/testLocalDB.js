import { testDBVersion } from '../init'

const { getRecordByKey } = require('../helpers').default

export async function testLocalDB () {
  const { status, error } = await testDBVersion()

  if (status !== 200) {
    console.error('INDEXEDDB ERROR!\n', { status, error })
    return null
  }

  const response = await getRecordByKey('content', '1.001.001.005')
  if (response.status !== 200) this.initContent()
  else this.$root.$emit('content-ready')
}
