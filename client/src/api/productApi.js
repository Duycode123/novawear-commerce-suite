import axios from "axios";
const API = "http://localhost:5000/api";

export const getProductDetails = (id) =>
    axios.get(`${API}/getsp/${id}`);

export const getFeedbackByProduct = (id) =>
    axios.get(`${API}/feedback/${id}`);
