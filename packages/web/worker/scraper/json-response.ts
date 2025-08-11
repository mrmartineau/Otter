import { getErrorMessage } from './get-error-message'

const generateJSONResponse = (obj: any) => {
  return new Response(JSON.stringify(obj), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'content-type': 'application/json;charset=UTF-8',
    },
  })
}

const generateErrorJSONResponse = (error: unknown, url?: string) => {
  const errorMessage = getErrorMessage(error)
  return generateJSONResponse({
    error: errorMessage,
    url,
    ...error,
  })
}

export { generateJSONResponse, generateErrorJSONResponse }
