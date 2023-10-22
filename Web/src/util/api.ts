export let apiUrl: string;
if (import.meta.env.PROD) {
  apiUrl = location.origin
} else {
  apiUrl = "http://localhost:3001"
}
