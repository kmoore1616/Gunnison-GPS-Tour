function deleteevent(id) {
    if (confirm("Are you sure you want to delete this event?")) {
        fetch(`/deleteevent/${id}`, { method: "POST" })
            .then(response => {
                if (response.ok) {
                    location.reload();
                }
            });
    }
}