import { testDBVersion } from '@/db/init'

import { getRecordByKey } from './getRecordByKey'

export async function testLocalDB () {
  const { status, error } = await testDBVersion()

  if (status !== 200) {
    console.error('INDEXEDDB ERROR!\n', { status, error })
    return false
  }

  const response = await getRecordByKey('content', '1.001.001.005')
  return response.status === 200
}
