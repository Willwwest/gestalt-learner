export interface CommunicatorProfile {
  id: string
  name: string
  createdAt: number
}

const PROFILES_KEY = 'echobloom:profiles:v1'
const ACTIVE_KEY = 'echobloom:active-profile:v1'
const DEFAULT_PROFILE: CommunicatorProfile = {
  id: 'default',
  name: 'My communicator',
  createdAt: 0,
}

function readProfiles(): CommunicatorProfile[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]') as unknown
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (profile): profile is CommunicatorProfile =>
          typeof profile === 'object' &&
          profile !== null &&
          typeof (profile as CommunicatorProfile).id === 'string' &&
          typeof (profile as CommunicatorProfile).name === 'string' &&
          typeof (profile as CommunicatorProfile).createdAt === 'number',
      )
      if (valid.some((profile) => profile.id === DEFAULT_PROFILE.id)) return valid
      return [DEFAULT_PROFILE, ...valid]
    }
  } catch {
    // A damaged registry must not keep the default communicator from opening.
  }
  return [DEFAULT_PROFILE]
}

function writeProfiles(profiles: CommunicatorProfile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch {
    // The default profile and its IndexedDB remain usable without localStorage.
  }
}

export function listCommunicatorProfiles(): CommunicatorProfile[] {
  const profiles = readProfiles()
  writeProfiles(profiles)
  return profiles
}

export function getActiveProfileId(): string {
  const profiles = readProfiles()
  let requested: string | null = null
  try {
    requested = localStorage.getItem(ACTIVE_KEY)
  } catch {
    return 'default'
  }
  return profiles.some((profile) => profile.id === requested) ? requested! : 'default'
}

export function getActiveProfile(): CommunicatorProfile {
  const activeId = getActiveProfileId()
  return readProfiles().find((profile) => profile.id === activeId) ?? DEFAULT_PROFILE
}

export function databaseNameForProfile(profileId: string) {
  return profileId === 'default' ? 'echobloom' : `echobloom-profile-${profileId}`
}

export function createCommunicatorProfile(name: string): CommunicatorProfile {
  const profile: CommunicatorProfile = {
    id: crypto.randomUUID(),
    name: name.trim() || 'New communicator',
    createdAt: Date.now(),
  }
  writeProfiles([...readProfiles(), profile])
  return profile
}

export function renameCommunicatorProfile(id: string, name: string) {
  const cleaned = name.trim()
  if (!cleaned) return
  writeProfiles(
    readProfiles().map((profile) =>
      profile.id === id ? { ...profile, name: cleaned } : profile,
    ),
  )
}

export function activateCommunicatorProfile(id: string) {
  if (!readProfiles().some((profile) => profile.id === id)) {
    throw new Error('That communicator profile no longer exists')
  }
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    throw new Error('Profile switching needs local device storage to be available')
  }
}

export async function deleteCommunicatorProfile(id: string) {
  if (id === 'default') throw new Error('The original communicator profile cannot be removed')
  if (id === getActiveProfileId()) throw new Error('Switch profiles before removing this one')
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseNameForProfile(id))
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not remove profile data'))
    request.onblocked = () => reject(new Error('Close EchoBloom in other tabs, then try again'))
  })
  writeProfiles(readProfiles().filter((profile) => profile.id !== id))
}
