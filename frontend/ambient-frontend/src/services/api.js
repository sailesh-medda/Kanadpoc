import axios from "axios"

const API = axios.create({
  baseURL: "http://127.0.0.1:8000"
})

export const sendTranscript = (data) =>
  API.post("/transcript", data)

export const getPatient = (id) =>
  API.get(`/patient/${id}`)