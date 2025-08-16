import userAgents from 'top-user-agents'

import uniqueRandomArray from 'unique-random-array'

export const randomUserAgent = uniqueRandomArray<string>(userAgents)
