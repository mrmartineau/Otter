import urlJoin from 'proper-url-join';

import './connect.css';

export default async function AuthConnect({
  searchParams,
}: {
  searchParams: {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    state: string;
  };
}) {
  console.log(`🚀 ~ searchParams:`, searchParams);
  const connectLink = urlJoin(`https://api.supabase.com/v1/oauth/authorize`, {
    query: {
      response_type: 'code',
      client_id: searchParams.client_id,
      code_challenge: searchParams.code_challenge,
      code_challenge_method: 'S256',
      redirect_uri: searchParams.redirect_uri,
      state: searchParams.state,
    },
  });
  return (
    <div className="connect">
      <a href={connectLink} className="focus">
        <img src="/connect-supabase.svg" />
      </a>
    </div>
  );
}
