import { Spinner } from './Spinner'

export const Loader = () => {
  return <Spinner show />
}

export const AppLoader = () => {
  return (
    <div className="flex items-center justify-center h-dvh">
      <div className="flex flex-col items-center gap-2">
        <img src="/otter-logo.svg" alt="Otter" className="w-20 h-20" />
        <div className="text-2xl font-bold">Loading Otter&hellip;</div>
      </div>
    </div>
  )
}

export const FullLoader = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner show size={50} />
    </div>
  )
}
