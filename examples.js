
// -----------------------------------------------------------------------------
// Customize Feedback behavior.
(function () {
  Feedback.debug = true;
  Feedback.parcel.sendQuickly = true;
  Feedback.parcel.useGetParams = true;
  Feedback.parcel.useSendBeacon = true;
  Feedback.trackPageviewIds = true
  Feedback.trackPageviews = true;
  Feedback.trackPresence = false;
}());

// -----------------------------------------------------------------------------
// Define Feedback.sendIncident
(function() {
  // This closure has 1 variable and 3 functions, like a singleton object. The functions act on the variable.
  var loggingIsOn;
  loggingIsOn = true;

  // When this event fires, the incident won't log again.
  document.addEventListener("turn_logging_off", function() {loggingIsOn = false});

  // When this event fires, the incident will log again.
  document.addEventListener("turn_logging_on", function() {loggingIsOn = true});

  // Feedback's sendIncident attribute is set to a function from this closure, so the value of loggingIsOn is available.
  Feedback.sendIncident = function(name, value) {
    if (loggingIsOn) {
      Feedback.parcel.capture({"incident[][name]": name,
                               "incident[][value]": value});
      if (Feedback.parcel.collector.length) setTimeout(Feedback.parcel.send, 100)
    }
  }
}());

// -----------------------------------------------------------------------------
// Trigger Feedback.sendIncident
(function() {
  // If user is on home screen, has a "last_access" cookies, has not been greeted, then record invitation incident.
  var lastAccessStr, now, lastAccess, timeSinceAccess;
  if ((window.location.pathname === "/") &&
      (null !== (lastAccessStr = getCookie("last_access"))) &&
      (sessionStorage.getItem("alreadyGreeted") !== "true")) {
    sessionStorage.setItem("alreadyGreeted", "true");
    now = new Date;
    lastAccess = new Date(lastAccessStr);
    timeSinceAccess = Math.abs(now - lastAccess) / 36e5;
    Feedback.sendIncident("Sent invitation", true);
  }
}());

(function() {
  // Use DOMContentLoaded to ensure page is loaded.
  window.addEventListener("DOMContentLoaded", function() {
    // If there's a data-agreement element, add a listener to record a click sendIncident.
    // Example: <button data-agreement="Yes">I Agree</button>
    document.querySelector("[data-agreement]").addEventListener("click", function() {
      Feedback.sendIncident("agreementForm", "Yes");
    })
  })
}());

// -----------------------------------------------------------------------------
// Define Feedback.sendPageview
(function() {
  var pageviewDefaults;
  Feedback.sendPageview = function(pageviewAttributes) {
    if (Feedback.trackPageviews) {
      if (pageviewAttributes == null) pageviewAttributes = {};
      if (Feedback.trackPageviewIds) {
        // Example: 9408d03b-c430-4869-ba75-59524cfa0d82
        Feedback.pageviewId = makeUuid();
        pageviewAttributes["pageview[pageviewId]"] = Feedback.pageviewId;
      }
      pageviewDefaults = {
        "browser[innerHeight]": window.innerHeight || 0,
        "browser[innerWidth]": window.innerWidth || 0,
        "browser[pixelRatio]": window.devicePixelRatio || 0,
        "browser[screenHeight]": screen.height,
        "browser[screenWidth]": screen.width,
        "pageview[host]": document.location.host,
        "pageview[pathname]": document.location.pathname,
        "pageview[referrer]": document.referrer,
        "pageview[search]": document.location.search,
        timezone: -(new Date).getTimezoneOffset() / 60
      };
      pageviewAttributes = overrideAttributes({}, pageviewDefaults, pageviewAttributes);
      Feedback.parcel.capture(pageviewAttributes);
      Feedback.parcel.sendQuickly ? setTimeout(Feedback.parcel.send, 500) : setTimeout(Feedback.parcel.send, 5000);
    }
  }
}());

// -----------------------------------------------------------------------------
// Trigger Feedback.sendPageview
(function() {
  var initialPageLoad = true;

  var logPageView = function(pageLoadType) {
    var pageViewLogged = false;
    var pageviewAttributes = {"pageview[type]": pageLoadType}
    if (document.visibilityState === "visible") {
      Feedback.sendPageview(pageviewAttributes);
      pageViewLogged = true;
    } else {
      document.addEventListener("visibilitychange", function() {
        if (!pageViewLogged && document.visibilityState === "visible") {
          Feedback.sendPageview(pageviewAttributes);
          pageViewLogged = true;
        }
      })
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    if (initialPageLoad) {
      initialPageLoad = false;
      logPageView("Page load, case 1");
    }
  });

  document.addEventListener("page:load", function() {
    if (!initialPageLoad) logPageView("Partial page load, case 1")
  });

  document.addEventListener("partial-page:load", function(event) {
    if (!initialPageLoad && event.originalEvent && event.originalEvent.data.timing.visitStart != null) {
      if (event.originalEvent.data.timing.requestStart != null) {
        logPageView("Partial page load, case 2")
      } else {
        logPageView("Partial page load, case 3")
      }
    }
  })
}());

// -----------------------------------------------------------------------------
// Define and trigger presence tracking.
(function() {
  if (Feedback.trackPresence) {
    setInterval(function() {
      Feedback.parcel.capture({
        presence: true
      });
      Feedback.parcel.send();
    }, 300 * 1000) // Interval is 300 seconds; every 5 min.
  }
}());

// -----------------------------------------------------------------------------
// Define Feedback.sendGroup. (Not currently triggered.)
(function() {
  Feedback.sendGroup = function(state, city) {
    Feedback.parcel.capture({
      "group[][state]": state,
      "group[][city]": city
    });
    Feedback.parcel.send();
  }
}());

// -----------------------------------------------------------------------------
// For testing only.
Feedback.sendGroup("Illinois", "Chicago");
Feedback.sendGroup("Indiana", "Lafayette");

Feedback.sendIncident("Color", "blue");
Feedback.sendIncident("Size", "large");
Feedback.sendIncident("Weight", "medium");

// -----------------------------------------------------------------------------
// Set last_access cookie to 10 days ago. (For testing only.)
(function () {
  var date = new Date;
  date.setTime(date.getTime() - 10 * 86.4e6);
  setCookie("last_access", date.toUTCString(), 90, false, 'Lax');
  sessionStorage.setItem("alreadyGreeted", "false");
}).call(this);

// -----------------------------------------------------------------------------
// Called by test buttons on the html page. (For testing only.)
function dispatchIncident(name) {
  var eventName = name;
  Feedback.sendIncident("Direction", "forward");
  Feedback.sendIncident("Speed", "max");
  const event = new Event(eventName);
  console.log(`Dispatch event: ${eventName}`);
  document.dispatchEvent(event);
}
