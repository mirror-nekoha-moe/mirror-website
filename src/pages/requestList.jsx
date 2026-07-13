import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RequestListPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        fetch("/api/request")
            .then(res => res.json())
            .then(data => {
                setRequests(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch requests:", err);
                setLoading(false);
            });
    }, []);

    return (
        <>
            <title>Requests</title>

            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-lg-9">

                        {loading && (
                            <div class="card">
                                <div class="card-body">
                                    Loading...
                                </div>
                            </div>
                        )}

                        {!loading && requests.length === 0 && (
                            <div class="card">
                                <div class="card-body">
                                    No requests found.
                                </div>
                            </div>
                        )}

                        {!loading && requests.map(req => (
                            <div
                                key={req.id}
                                class="card mb-3 request-card"
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/request/status/${req.id}`)}
                            >
                                <div class="card-body d-flex justify-content-between align-items-center">

                                    <div>
                                        <div>
                                            <strong>Request #{req.id}</strong>
                                        </div>

                                        <div class="text-muted">
                                            {req.created_at}
                                        </div>
                                    </div>

                                    <div class="text-end">
                                        <div>
                                            <span class="badge bg-secondary text-black">
                                                {req.item_count} items
                                            </span>
                                        </div>

                                        <div class="mt-1">
                                            <span class={`badge ${
                                                req.status === "pending" ? "bg-warning text-black"
                                                : req.status === "denied" ? "bg-danger"
                                                : "bg-success"
                                            }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}