# Development Notes

1. Copy the Code.gs, index.html files to the AppScript tab in doc/sheet: In the menu bar, `Extensions` -> `App Script`.

2. If you need to run the backend locally, you have to local tunnel your server so that Google App Script has access to it
```
 ngrok http http://localhost:8000
```

3. Replace the server URL in both web env file, and in the Code.gs file