async function test() {
    const res = await fetch('http://localhost:5000/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "SELECT 1 as test;" })
    });
    const data = await res.json();
    console.log(data);
}
test();
