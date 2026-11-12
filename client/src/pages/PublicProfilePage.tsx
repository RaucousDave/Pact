import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { ProfileCanvas } from "../components/ProfileCanvas";
import { PactLoader } from "../components/Toast";
import { api, apiError } from "../lib/api";
import { isValidHandle } from "../lib/auth";
import { fromApiTheme, type CreatorPage } from "../lib/page-model";
import "../preview.css";
import "../public-profile.css";

export function PublicProfilePage() {
  const { username = "" } = useParams();
  const handle = username.toLowerCase();
  const valid = isValidHandle(handle);
  const profile = useQuery({
    queryKey: ["public-profile", handle],
    queryFn: async ({ signal }) =>
      (await api.get<CreatorPage>(`/users/${encodeURIComponent(handle)}/page`, { signal })).data,
    enabled: valid,
    retry: false,
  });
  const missing = !valid || (axios.isAxiosError(profile.error) && profile.error.response?.status === 404);

  if (missing) return (
    <main className="not-found">
      <h1>Profile not found.</h1>
      <p>Check the username in the link and try again.</p>
      <Link to="/" className="button button-primary">Back to Pact</Link>
    </main>
  );
  if (profile.isPending) return <PactLoader message={`Finding @${handle}…`} />;
  if (profile.isError) return (
    <main className="not-found">
      <h1>Couldn’t load this profile.</h1>
      <p role="alert">{apiError(profile.error)}</p>
      <button className="button button-primary" disabled={profile.isFetching} onClick={() => void profile.refetch()}>Try again</button>
    </main>
  );
  return (
    <main className="public-profile-page">
      <ProfileCanvas
        preview={false}
        identity={profile.data.creator}
        theme={fromApiTheme(profile.data.theme)}
        content={profile.data}
      />
    </main>
  );
}
