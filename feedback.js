
function setCookie(name, value, expiresInDays, secure, sameSite) {
  // Example: setCookie("cookie name", "cookie value", 90, false, 'Lax');
  // Cookies with SameSite=None must also specify Secure, meaning they require a secure (https) connection.
  // path=/ says that the cookie applies to all paths.
  var valueStr = `${value}`;
  var date = new Date;
  date.setTime(date.getTime() + expiresInDays * 86.4e6); // days to milliseconds
  var expiresStr = `;expires=${date.toUTCString()}`;
  var sameSiteStr = sameSite ? `;SameSite=${sameSite}` : "";
  if (sameSite.toLowerCase() == "none") secure = true;
  var secureStr = secure ? ";Secure" : "";
  var pathStr = ";path=/";
  var cookie = `${name}=${valueStr}${expiresStr}${sameSiteStr}${secureStr}${pathStr}`;
  document.cookie = cookie;
}

function updateCookie(name, value) {
  // Example: updateCookie("cookie name", "new cookie value");
  document.cookie = `${name}=${value}`
}

function getCookie(name) {
  // Example: getCookie("cookie name")
  var namePattern = `${name}=`
  var cookies = decodeURIComponent(document.cookie).split(";");
  for (var cookie, index = 0; index < cookies.length; index++) {
    cookie = cookies[index];
    if (cookie.charAt(0) == " ") cookie = cookie.substring(1);
    if (cookie.indexOf(namePattern) == 0) return cookie.substring(namePattern.length, cookie.length)
  }
  return null
}

function makeUuid() {
  // Version 4 UUID
  return (Feedback.hex4() + Feedback.hex4() + "-" +
          Feedback.hex4() + "-" +
          "4" + Feedback.hex4().substr(0, 3) + "-" +
          Feedback.hex4() + "-" +
          Feedback.hex4() + Feedback.hex4() + Feedback.hex4()).toLowerCase()
}

function overrideAttributes(targetObject) {
  // Expects a target object along with source objects to overwrite target's attributes.
  // Source objects are taken left-to-right; last one wins.
  // If no target object, return empty object.
  // Example:
  // var obj1 = {"host": "host1"}, obj2 = {"host": "host2"};
  // console.log(overrideAttributes({}, obj1, obj2));
  // > {host: "host2"}
  // console.log(overrideAttributes({}, obj2, obj1));
  // > {host: "host1"}
  targetObject = targetObject || {};
  // First arg is the target object, so skip it.
  for (var index = 1; index < arguments.length; index++) {
    sourceObject = arguments[index];
    if (sourceObject) {
      for (var name in sourceObject) {
        if (sourceObject.hasOwnProperty(name)) targetObject[name] = sourceObject[name];
      }
    }
  }
  return targetObject
}

(function() {
  window.Feedback = {
    // These default values are in the global namespace, so they're settable by other functions.
    _sourceUuid: null,
    debug: false,
    dev: location.host.match(/.*?\.dev/),
    hostDev: "climatemojo.dev",
    hostPrd: "climatemojo.com",
    path: "climate.png",
    sourceName: null,
    uuid: null,
    destinationUrl: function() {
      var host = Feedback.dev ? Feedback.hostDev : Feedback.hostPrd;
      var url = `${window.location.protocol}//${host}/${Feedback.path}?`;
      return url;
    },
    hex4: function() {
      // Returns a random, 4-digit hexadecimal number.
      // 2**16 = 65536. Bitwise OR with 0 floors number, converting float to int.
      return (65536 * (1 + Math.random()) | 0).toString(16).substring(1)
    },
    sourceUuid: function() {
      // If the uuid already exists, use it.
      if (Feedback._sourceUuid != null) {
        return Feedback._sourceUuid;
      } else {
        // If the uuid is available in the cookies, use that.
        Feedback._sourceUuid = getCookie("_feedback_uuid") || getCookie("_feedback_uuid_lax");
        if (Feedback._sourceUuid == null) {
          // No uuid available, so create a new one.
          // Example: 0fd20a32-f571-4abe-38c4-e81c0c8e0150
          Feedback._sourceUuid = makeUuid();
        }
        // Save the uuid in the cookies.
        setCookie("_feedback_uuid", Feedback._sourceUuid, 90, true, "None");
        setCookie("_feedback_uuid_lax", Feedback._sourceUuid, 90, false, "Lax")
        return Feedback._sourceUuid;
      }
    },
  }
}());

(function() {
  Feedback.parcel = {
    collector: [], // Example: [["key1","value1"],["key2","value2"],["key1","value3"],["key1","value4"]]
    enabled: true,
    useSendBeacon: true,
    useGetParams: true,
    capture: function(attributes) {
      for (var key in attributes) Feedback.parcel.collector.push([key, attributes[key]])
    },
    send: function() {
      // Note: An empty Feedback.parcel.collector gets logged, but no send is attempted.
      if (Feedback.debug) console.log(JSON.stringify(Feedback.parcel.collector));
      if (Feedback.parcel.enabled) {
        var index, pair, results = {};
        for (index in Feedback.parcel.collector) {
          if ("function" != typeof(pair = Feedback.parcel.collector[index])) {
            key = pair[0]
            value = pair[1]
            // Case 1: The results hash doesn't have this key, so add it.
            if (typeof results[key] == "undefined") {
              results[key] = value

              // Case 2: The results value is an array, so push value onto the array.
            } else if (Object.prototype.toString.call(results[key]) === "[object Array]") {
              results[key].push(value)

              // Case 3: The results value is not a collection, so make it an array of both the existing and new values.
            } else {
              results[key] = [results[key], value]
            }
          }
        }
        // Send the data to the server.
        if (Object.keys(results).length) {
          if (Feedback.sourceName) results.sourceName = Feedback.sourceName;
          if (Feedback.uuid) results.uuid = Feedback.uuid;
          results.sourceUuid = Feedback.sourceUuid();

          // Convert results into form data.
          var formData = new FormData;
          for (key in results) formData.append(key, results[key]);

          // Send method 1: navigator.sendBeacon.
          if (Feedback.parcel.useSendBeacon && navigator.sendBeacon !== undefined) {
            Feedback.parcel.useSendBeacon = navigator.sendBeacon(Feedback.destinationUrl(), formData)
          }
          // Send method 2: Append params to the GET request.
          else if (Feedback.parcel.useGetParams && JSON.stringify(results).length < 4096) {
            var url = Feedback.destinationUrl();
            for (key in results) url += `&${key}=${encodeURIComponent(results[key])}`;
            var image = new Image;
            image.src = url;
            image.onerror = function() {
              if (Feedback.dev) {
                Feedback.parcel.enabled = false;
                console.warn("Problem sending feedback parcel. Disabling parcel.")
              }
            }
          }
          // Send method 3: An XHR post request, sending form data.
          else {
            var xhr = new XMLHttpRequest;
            xhr.open("POST", Feedback.destinationUrl(), true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            xhr.send(formData)
            xhr.onerror = function() {
              if (Feedback.dev) {
                Feedback.parcel.enabled = false;
                console.warn("Problem sending feedback parcel. Disabling parcel.")
              }
            }
          }
        }
        // Empty collector since we've already sent them.
        return Feedback.parcel.collector = []
      }
    }
  }
}());
