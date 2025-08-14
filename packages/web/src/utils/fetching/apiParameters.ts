import {
  DEFAULT_API_RESPONSE_LIMIT,
  DEFAULT_API_RESPONSE_ORDER,
} from '../../constants'
import type { RequestOrder, Status } from '../../types/api'

export interface BaseApiParameters {
  limit: number
  offset: number
  order: RequestOrder
  status: Status
  type: string | undefined
  tag: string | undefined
  top: boolean | undefined
}

export interface ApiParametersQuery extends BaseApiParameters {
  star: boolean | undefined
  public: boolean | undefined
}
export interface ApiParametersReturn extends BaseApiParameters {
  star: boolean | null
  public: boolean | null
}

export const apiParameters = (
  apiParams: Partial<ApiParametersQuery>,
): Partial<ApiParametersReturn> => {
  const limit = Number(apiParams?.limit) || DEFAULT_API_RESPONSE_LIMIT
  const offset = Number(apiParams?.offset) || 0
  const order = apiParams?.order || DEFAULT_API_RESPONSE_ORDER
  const status = apiParams?.status || 'active'
  const star = apiParams?.star || false
  const publicItems = apiParams?.public || false
  const type = apiParams?.type || undefined
  const tag = apiParams?.tag ? decodeURIComponent(apiParams.tag) : undefined
  const top = apiParams?.top || undefined

  return {
    limit,
    offset,
    order: order as RequestOrder,
    public: publicItems as boolean,
    star,
    status: status as Status,
    tag,
    top,
    type,
  }
}
