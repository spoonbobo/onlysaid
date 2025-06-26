import axios from "axios";

export const sayHiToonlysaid = async () => {
  const url = process.env.CLIENT_URL + "/api/health";
  const response = await axios.get(url);
  return response.data;
};

export const insertMessageInDb = async (msg) => {
  const url = process.env.CLIENT_URL + "/api/chat/insert";
  const response = await axios.post(url, {
    msg,
  });
  return response.data;
};
