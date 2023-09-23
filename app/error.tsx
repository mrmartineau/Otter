'use client';

const Error = ({ error, reset }: { error: Error; reset: () => void }) => {
  return (
    <div className="p-m">
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  );
};

export default Error;
