if (window.ytAutoPauseInjected !== true) {
  window.ytAutoPauseInjected = true;
  let manuallyPaused = false;
  let automaticallyPaused = false;
  let isMouseOnPage = true;

  // Send message to service worker
  function sendMessage(message) {
    if (!chrome.runtime?.id) {
      return;
    }

    if (chrome.runtime.lastError) {
      console.error(
        `Youtube Autopause error: ${chrome.runtime.lastError.toString()}`
      );
      return;
    }

    chrome.runtime.sendMessage(message, function () {
      void chrome.runtime.lastError;
    });
  }

  // Listen to visibilitychange event of the page
  document.addEventListener(
    "visibilitychange",
    function () {
      if (document.hidden !== undefined) {
        sendMessage({ minimized: document.hidden });
      }
    },
    false
  );

  document.addEventListener('mouseenter', function() {
    if (document.hidden !== undefined) {
        sendMessage({ minimized: false });
      }
  });

  document.addEventListener('mouseleave', function() {
    if (document.hidden !== undefined) {
        sendMessage({ minimized: true });
      }
  });

  // Listen media commands from the service worker
  chrome.runtime.onMessage.addListener(async function (
    request,
    sender,
    sendResponse
  ) {
    if (!("action" in request)) {
      return false;
    }
    const videoElements = document.getElementsByTagName("video");

    for (let i = 0; i < videoElements.length; i++) {
      try {
        if (request.action === "stop" && !manuallyPaused) {
          automaticallyPaused = true;
          videoElements[i].pause();
        } else if (
          request.action === "resume" &&
          videoElements[i].paused &&
          !manuallyPaused
        ) {
          automaticallyPaused = false;
          await videoElements[i].play();
        } else if (request.action === "toggle_mute") {
          videoElements[i].muted = !videoElements[i].muted;
        } else if (request.action === "mute") {
          videoElements[i].muted = true;
        } else if (request.action === "unmute") {
          videoElements[i].muted = false;
        } else if (request.action === "toggle") {
          if (videoElements[i].paused && !manuallyPaused) {
            await videoElements[i].play();
            automaticallyPaused = false;
          } else if (!manuallyPaused) {
            videoElements[i].pause();
            automaticallyPaused = true;
          }
        }
      } catch (e) {
        // NOOP
      }
    }
    sendResponse({});
    return true;
  });

  // Intersection observer for the video elements in page
  // can be used to determine when video goes out of viewport
  const intersection_observer = new IntersectionObserver(
    function (entries) {
      if (entries[0].isIntersecting === true) {
        sendMessage({ visible: true });
      } else {
        sendMessage({ visible: false });
      }
    },
    { threshold: [0] }
  );

  // Start observing video elements
  let videoElements = document.getElementsByTagName("video");
  for (let i = 0; i < videoElements.length; i++) {
    intersection_observer.observe(videoElements[i]);
    videoElements[i].addEventListener("pause", (_e) => {
      if (!automaticallyPaused) {
        manuallyPaused = true;
        automaticallyPaused = false;
      }
    });
    videoElements[i].addEventListener("play", (_e) => {
      manuallyPaused = false;
    });
  }
}
