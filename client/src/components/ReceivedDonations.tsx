import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { donationError, receivedDonations, transactionLink } from "../lib/donations";
import "../donations.css";

export function ReceivedDonations({ accountId }: { accountId: number }) {
  const donations = useQuery({ queryKey: ["received-donations", accountId], queryFn: ({ signal }) => receivedDonations(signal), retry: false });
  return <section className="received-donations" aria-labelledby="received-title">
    <div className="donation-heading"><div><span className="section-kicker">Your supporters</span><h2 id="received-title">Received donations</h2></div><Button variant="outline" disabled={donations.isFetching} onClick={() => void donations.refetch()}>Refresh</Button></div>
    {donations.isPending ? <p role="status">Loading your donations…</p> : donations.isError ? <p role="alert">{donationError(donations.error)}</p> : !donations.data.length ? <p>No donations yet. Add a tip card to your page and share your link.</p> : <ul>{donations.data.map((donation) => <li key={donation.id}><div><strong>{donation.name}</strong><strong>{donation.amount} USDC</strong></div>{donation.message && <p>{donation.message}</p>}{donation.status && <small>{donation.status.replaceAll("_", " ")}</small>}{donation.hash && <a href={transactionLink(donation.hash)} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}</li>)}</ul>}
  </section>;
}
