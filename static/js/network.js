import {
  deleteSessionFromLocalStorage,
  generateHeadersFromSession,
} from "./session.js";

export const makeRequest = (uri, parameters) =>
    // parameters -> method, headers, body
    new Promise((resolve, reject) => {
      const request = new XMLHttpRequest(),
        headers = parameters.headers,
        method = parameters.method,
        body = parameters.body,
        onResponse = () => {
          if ([4, 5].includes(Math.floor(request.status / 100))) {
            return reject({
              errorType: "network",
              errorCode: request.status,
              errorMessage: request.responseText,
            });
          }
          const response = {
            status: request.status,
            text: request.responseText,
          };
          try {
            response.json = JSON.parse(request.responseText);
          } catch {}
          resolve(response);
        };
      request.addEventListener("load", onResponse);
      if (method === undefined) reject("Undefined method");
      request.open(method, uri);
      // Set headers
      if (headers !== undefined) {
        if (typeof headers !== "object")
          return reject({
            errorType: "local",
            errorMessage: "Headers are defined but not object",
          });
        if (Object.values(headers).some((value) => typeof value !== "string"))
          return reject({
            errorType: "local",
            errorMessage: "Some headers do not have a String value",
          });
        Object.entries(headers).forEach((headerEntry) =>
          request.setRequestHeader(headerEntry[0], headerEntry[1]),
        );
      }
      if (body !== undefined) {
        request.setRequestHeader("Content-Type", "application/json");
        return request.send(body);
      }
      return request.send();
    }),
  makeRequestWithSession = async (session, uri, parameters) => {
    const sessionParameters = { ...parameters };
    sessionParameters.headers = {
      ...parameters.headers,
      ...(session !== undefined ? generateHeadersFromSession(session) : {}),
    };
    try {
      return await makeRequest(uri, sessionParameters);
    } catch (error) {
      if (error.errorType === "network" && error.errorCode === 403) {
        try {
          if (JSON.parse(error.errorMessage).sessionDidNotPass === true) {
            deleteSessionFromLocalStorage();
            return await makeRequest(uri, parameters);
          }
        } catch {}
        throw error;
      }
      throw error;
    }
  },
  get = (uri, headers) =>
    makeRequest(uri, {
      method: "GET",
      headers: headers,
    }),
  post = (uri, headers, body) =>
    makeRequest(uri, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    }),
  getWithSession = (session, uri, headers) =>
    makeRequestWithSession(session, uri, {
      method: "GET",
      headers: headers,
    });

export const postWithSession = (session, uri, body, headers) =>
    makeRequestWithSession(session, uri, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    }),
  putWithSession = (session, uri, body, headers) =>
    makeRequestWithSession(session, uri, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(body),
    }),
  deleteWithSession = (session, uri, headers) =>
    makeRequestWithSession(session, uri, {
      method: "DELETE",
      headers: headers,
    });
