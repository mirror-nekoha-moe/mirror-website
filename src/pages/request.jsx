import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BeatmapRequestPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([{ id: crypto.randomUUID() }]);

    function addRequest() {
        setRequests(prev => [...prev, { id: crypto.randomUUID() }]);
    }

    async function submit(e) {
        e.preventDefault();

        const form = e.currentTarget;

        form.classList.add("was-validated");

        // Native HTML validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const cards = form.querySelectorAll(".request-card");

        const grouped = [];

        cards.forEach(card => {
            const type = card.querySelector("select[name='type']");
            const beatmapsetId = card.querySelector("input[name='beatmapsetId']");
            const beatmapsetUrl = card.querySelector("input[name='beatmapsetUrl']");
            const oszUrl = card.querySelector("input[name='oszUrl']");
            const notes = card.querySelector("textarea[name='notes']");

            grouped.push({
                type: type.value,
                beatmapsetId: beatmapsetId.value,
                beatmapsetUrl: beatmapsetUrl.value,
                oszUrl: oszUrl.value,
                notes: notes.value
            });
        });

        const res = await fetch("/api4/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(grouped)
        });

        if (!res.ok) {
            console.error("Request failed");
            return;
        }

        const data = await res.json();

        navigate(`/request/status/${data.requestId}`);
    }

    function removeRequest(id) {
        setRequests(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== id));
    }

    return (
        <>
            <title>Request</title>

            <div className="container py-5">
                <form className="needs-validation" noValidate onSubmit={submit}>
                    <div className="row justify-content-center">
                        <div className="col-lg-9">

                            {requests.map((req, i) => (
                                <div key={req.id} className="card mb-4 request-card">

                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <span>Request #{i + 1}</span>

                                        {i !== 0 && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeRequest(req.id)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="card-body">

                                        <div className="mb-3">
                                            <label className="form-label">Request Type</label>
                                            <select className="form-select bg-primary" name="type" required>
                                                <option value="">Select...</option>
                                                <option value="new">New</option>
                                                <option value="update">Update</option>
                                            </select>
                                        </div>

                                        <div className="row mb-3">
                                            <div className="col-md-6">
                                                <label className="form-label">Beatmapset ID</label>
                                                <input
                                                    className="form-control bg-primary"
                                                    name="beatmapsetId"
                                                    type="number"
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-6">
                                                <label className="form-label">Beatmapset URL</label>
                                                <input
                                                    className="form-control bg-primary"
                                                    name="beatmapsetUrl"
                                                    type="url"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">.osz URL</label>
                                            <input
                                                className="form-control bg-primary"
                                                name="oszUrl"
                                                type="url"
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Notes</label>
                                            <textarea
                                                className="form-control bg-primary"
                                                name="notes"
                                                rows="3"
                                            />
                                        </div>

                                    </div>
                                </div>
                            ))}

                            <div className="d-flex flex-column flex-md-row gap-2">
                                <button type="button" className="btn btn-secondary" onClick={addRequest}>
                                    Add Another Beatmap
                                </button>
                                <button type="submit" className="btn btn-success">
                                    Submit Request
                                </button>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}