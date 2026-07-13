import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function RequestStatusPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    
    useEffect(() => {
        fetch(`/api/request/${id}`)
            .then(async (r) => {
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to load request");
                }
                return r.json();
            })
            .then(setData)
            .catch((err) => {
                setData({ error: err.message });
            });
    }, [id]);

    if (data?.error) {
        return (
            <div className="container py-5">
                <div className="alert bg-danger">
                    {data.error}
                </div>
            </div>
        );
    }

    if (!data) {
        return <div className="container py-5">Loading...</div>;
    }

    return (
        <>
            <title>Request Status</title>

            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-lg-9">

                        {/* Header Card */}
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <span>Request {data.id}</span>

                                <span class={`badge ${
                                    data.status === "pending" ? "bg-warning text-black"
                                    : data.status === "denied" ? "bg-danger"
                                    
                                    : "bg-success"
                                }`}>
                                    {data.status}
                                </span>
                            </div>

                            <div class="card-body">
                                <div>
                                    <strong>Status:</strong> {data.status}
                                </div>

                                {data.created_at && (
                                    <div class="mt-2">
                                        <strong>Created:</strong> {data.created_at}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        {data.items?.map((item, i) => (
                            <div key={i} class="card mb-4 request-card">

                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span>Item #{i + 1}</span>

                                    <span class="badge bg-primary">
                                        {item.type}
                                    </span>
                                </div>

                                <div class="card-body">

                                    <div class="mb-2">
                                        <strong>Beatmapset ID:</strong>{" "}
                                        {item.beatmapset_id || "-"}
                                    </div>

                                    <div class="mb-2">
                                        <strong>Beatmapset URL:</strong>{" "}
                                        {item.beatmapset_url || "-"}
                                    </div>

                                    <div class="mb-2">
                                        <strong>OSZ URL:</strong>{" "}
                                        {item.osz_url || "-"}
                                    </div>

                                    <div class="mt-3">
                                        <strong>Notes:</strong>
                                        <div class="mt-1">
                                            {item.notes || "-"}
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