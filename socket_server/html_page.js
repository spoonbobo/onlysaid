function serveHtmlPage(app) {
  app.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redis Cluster Demo</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          #messages { list-style-type: none; margin: 0; padding: 0; }
          #messages li { margin-bottom: 5px; padding: 5px; background-color: #f1f1f1; }
          input { padding: 5px; width: 300px; }
          button { padding: 5px 10px; }
        </style>
      </head>
      <body>
        <h1>Redis Cluster Demo</h1>
        <div>
          <input id="messageInput" placeholder="Type a message..." />
          <button id="sendBtn">Send</button>
        </div>
        <h2>Messages from Queue:</h2>
        <ul id="messages"></ul>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          const messageInput = document.getElementById('messageInput');
          const sendBtn = document.getElementById('sendBtn');
          const messagesList = document.getElementById('messages');

          socket.on('queueData', (data) => {
            const li = document.createElement('li');
            li.textContent = JSON.stringify(data);
            messagesList.prepend(li);
          });

          sendBtn.addEventListener('click', () => {
            const message = messageInput.value;
            if (message) {
              socket.emit('sendMessage', message);
              messageInput.value = '';
            }
          });

          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              sendBtn.click();
            }
          });
        </script>
      </body>
      </html>
    `);
  });
}

module.exports = { serveHtmlPage };
