function deleteReview(id) {
    if (confirm("Are you sure you want to delete this review?")) {
        fetch(`/deletereview/${id}`, { method: 'POST' })
            .then(() => window.location.reload());
    }
}