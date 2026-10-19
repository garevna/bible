import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useWorkerStore } from '@/stores/worker'

/** A member of a home group: the birthday and the note are seen by the leader only (see worker/src/groups.ts) */
export interface GroupMember {
  id: string
  name: string
  /** 'YYYY-MM-DD', or '--MM-DD' without the year */
  birthday: string | null
  note: string
}

/** A home group: it meets once a week at its place; its leader keeps it */
export interface HomeGroup {
  id: string
  name: string
  leaderUid: string
  leaderName: string
  address: string
  lat?: number
  lng?: number
  /** 0 Sunday … 6 Saturday */
  weekday: number | null
  time: string
  description: string
  members: GroupMember[]
  meetingNote: string
  /** the user sees it whole: its leader, or a supervisor */
  own: boolean
}

export type GroupsVisibility = 'servants' | 'admins'

/** what the leader of a group changes */
export type GroupChange = Partial<
  Pick<
    HomeGroup,
    'address' | 'weekday' | 'time' | 'description' | 'members' | 'meetingNote' | 'name' | 'leaderUid'
  >
> & {
  /** null: the point on the map is taken away */
  lat?: number | null
  lng?: number | null
}

export const useGroupsStore = defineStore('groups', () => {
  const worker = useWorkerStore()

  const groups = ref<HomeGroup[]>([])
  const visibility = ref<GroupsVisibility>('servants')
  /** the user creates the groups and gives their leaders */
  const manage = ref(false)
  const loaded = ref(false)

  async function load() {
    const answer = await worker.request<{
      groups: HomeGroup[]
      visibility: GroupsVisibility
      manage: boolean
    }>('GET', '/groups')
    groups.value = answer.groups
    visibility.value = answer.visibility
    manage.value = answer.manage
    loaded.value = true
  }

  const put = (group: HomeGroup) => {
    groups.value = groups.value.some((item) => item.id === group.id)
      ? groups.value.map((item) => (item.id === group.id ? group : item))
      : [...groups.value, group]
    return group
  }

  const create = async (name: string, leaderUid: string) =>
    put((await worker.request<{ group: HomeGroup }>('POST', '/groups', { name, leaderUid })).group)

  const update = async (id: string, change: GroupChange) =>
    put(
      (await worker.request<{ group: HomeGroup }>('PUT', `/groups/${encodeURIComponent(id)}`, change)).group
    )

  async function remove(id: string) {
    await worker.request('DELETE', `/groups/${encodeURIComponent(id)}`)
    groups.value = groups.value.filter((item) => item.id !== id)
  }

  async function setVisibility(value: GroupsVisibility) {
    visibility.value = (
      await worker.request<{ visibility: GroupsVisibility }>('PUT', '/groups-visibility', {
        visibility: value
      })
    ).visibility
  }

  /** the groups that meet on a day ('YYYY-MM-DD'), by their time */
  const meetingOn = (day: string) => {
    const weekday = new Date(`${day}T12:00:00`).getDay()
    return groups.value
      .filter((group) => group.weekday === weekday)
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  return { groups, visibility, manage, loaded, load, create, update, remove, setVisibility, meetingOn }
})
