export const Loader = () => {
  return <div>Loading...</div>
}

export const FullLoader = () => {
  return (
    <div className="loader flex items-center justify-center h-dvh">
      <div className="flex flex-col items-center gap-2">
        <img src="/otter-logo.svg" alt="Otter" className="w-20 h-20" />
        <div className="text-2xl font-bold">Loading Otter&hellip;</div>
      </div>
    </div>
  )
}
