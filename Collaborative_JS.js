const OPERATION_CREATE = "create";
const OPERATION_SEND = "send";
const OPERATION_JOIN = "join";
const OPERATION_RECEIVE = "receive";

const ERR_QUEUE_NAME_NOT_SPECIFIED = 460;
const ERR_START = ERR_QUEUE_NAME_NOT_SPECIFIED;
const ERR_OPERATION_NAME_NOT_SPECIFIED = 461;
const ERR_RESERVED_QUEUE_NAME = 462;
const ERR_QUEUE_IN_USE = 463;
const ERR_QUEUE_NOT_FOUND = 464;
const ERR_INVALID_OPERATION = 465;
const ERR_NO_NEW_OPERATION = 466;

/**
 * Communicates with server using HTTP requests and responses
 * @param {URL} server URL of the server to whom the data will be sent
 * @param {JSON} data The data to send
 * @param {string} operation The option to perform, by default, operation is send
 * @param {function} statusHandler Handles what would happen if the queue is not
 * found while sending data, which inevitably means disconnection.
 */
function post_data(
	server,
	data,
	operation = OPERATION_SEND,
	statusHandler = function (http) {
		if (http.status == ERR_QUEUE_NOT_FOUND) {
			updateStatus(
				"Invalid session ID! (maybe disconnected due to inactivity)"
			);
			document.getElementById("session_id_value").innerHTML = "-";
		}
	}
) {
	var http = new XMLHttpRequest();
	var url = server;
	data.operation = operation;
	data.clientID = CLIENT_ID;
	data.sending_queue_name = SENDING_QUEUE_NAME;
	data.receiving_queue_name = RECEIVING_QUEUE_NAME;
	var params = JSON.stringify(data); //JSON.parse(data);
	http.onreadystatechange = function () {
		statusHandler(http);
	};
	http.open("POST", url, true);
	//console.log(data);
	//Send the proper header information along with the request
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	http.send(params);
	//window.open(url);
}

function levenshteinDistance(from, to) {
	if (to == "") return null;
	var matrix = new Array((from.length + 1) * (to.length + 1));
	const width = to.length + 1;
	const height = from.length + 1;
	matrix[0] = 0;

	for (var i = 1; i < width; i++) matrix[i] = i;
	for (var i = 1; i < height; i++) matrix[i * width] = i;

	for (var i = 1; i < height; i++) {
		for (var j = 1; j < width; j++) {
			if (from[i - 1] == to[j - 1]) {
				matrix[i * width + j] = matrix[(i - 1) * width + j - 1];
			} else {
				matrix[i * width + j] =
					Math.min(
						matrix[i * width + (j - 1)],
						matrix[(i - 1) * width + j],
						matrix[(i - 1) * width + j - 1]
					) + 1;
			}
		}
	}
	return matrix;
}

function levenshteinOperation(distance, from, to) {
	if (distance == null) {
		return [[0, 0, -1]];
	}
	var operations = [];
	var lastCopy = null;
	var lastInsert = "";
	const width = to.length + 1;
	var currentWidth = to.length;
	var currentHeight = from.length;
	while (currentHeight > 0 || currentWidth > 0) {
		if (from[currentHeight - 1] === to[currentWidth - 1]) {
			if (lastInsert !== "") {
				operations.splice(0, 0, [1, lastInsert]);
				lastInsert = "";
			}
			if (lastCopy == null) {
				lastCopy = [0, currentHeight - 1, currentHeight];
			} else {
				lastCopy[1] = currentHeight - 1;
			}
			currentHeight--;
			currentWidth--;
		} else {
			if (lastCopy != null) {
				operations.splice(0, 0, lastCopy);
				lastCopy = null;
			}
			var present = distance[currentHeight * width + currentWidth] - 1;
			var left = distance[currentHeight * width + currentWidth - 1];
			// an up arrow denotes a remove operation
			// so we don't really need to do anything in that case
			var up = distance[(currentHeight - 1) * width + currentWidth];
			var corner =
				distance[(currentHeight - 1) * width + currentWidth - 1];
			if (present == left || present == corner) {
				lastInsert = to[currentWidth - 1] + lastInsert;
			}
			if (present == left) {
				currentWidth--;
			} else if (present == corner) {
				currentHeight--;
				currentWidth--;
			} else {
				currentHeight--;
			}
		}
	}
	if (lastCopy != null) {
		lastCopy[1] = 0;
		operations.splice(0, 0, lastCopy);
	}
	if (lastInsert != "") {
		operations.splice(0, 0, [1, lastInsert]);
	}
	return operations;
}

var SENDING_QUEUE_NAME = "";
var RECEIVING_QUEUE_NAME = "";
var CLIENT_ID = -1;
var URL = "";
const QUEUE_NAME_LENGTH = 64;

/**
 * Converts Integer -> String i.e. 0-255 -> '00'-'ff'
 * @param {number} dec A decimal number
 * @returns {string} String repesentation of the hex value corresponding to dec
 */
function dec2hex(dec) {
	return dec.toString(16).padStart(2, "0");
}

/**
 * Creates a random ID name of given length
 * @param {number} len Lenght of the ID to generate
 * @returns {string} random ID name
 */
function generateId(len) {
	var arr = new Uint8Array((len || 40) / 2);
	window.crypto.getRandomValues(arr);
	return Array.from(arr, dec2hex).join("");
}

const MAX_RETRY = 10;

/**
 * Updates the connection status display
 * @param {string} text Status to display
 */
function updateStatus(text) {
	document.getElementById("connection_status").innerHTML = text;
}

/**
 * Establishes a sending and receiving comunication queue with server
 * @param {*} cb Callback function to execute
 * @param {*} qname Name of the queue to connect
 * @param {*} count Trial count
 * @returns {void}
 */
function establishQueue(cb, qname = "", count = 1) {
	if (count > MAX_RETRY) {
		cb("Connection failed!", null);
		return;
	}
	updateStatus(count > 1 ? "Retrying..\t" : "" + "Generating queue name..");

	SENDING_QUEUE_NAME = qname;
	if (qname.length == 0) {
		// if we don't have a given queue name, generate a new one
		SENDING_QUEUE_NAME = generateId(QUEUE_NAME_LENGTH);
		RECEIVING_QUEUE_NAME = generateId(QUEUE_NAME_LENGTH);
	}

	post_data(
		URL,
		{},
		// this is a 'join' call if we have an user provided queue
		qname.length == 0 ? OPERATION_CREATE : OPERATION_JOIN,
		function (http) {
			if (http.readyState == XMLHttpRequest.DONE) {
				updateStatus("Response recevied from server..");
				console.log(
					"[x] Server said: ",
					http.response,
					" (Status: ",
					http.status,
					")"
				);
				if (http.status != 200) {
					// request failed, so retry only if queue name is auto generated
					if (qname.length == 0) establishQueue(cb, "", count + 1);
					// otherwise, invoke the callback with server response as error
					else cb(http.response, null);
				} else {
					cb(null, http.response);
				}
			}
		}
	);
	// }
}

/**
 * Performs a connection with the server
 * @param {boolean} isJoin Decision whether client wants to join an existing
 * session or create a new one
 */
function performConnection(isJoin) {
	// reset session id
	document.getElementById("session_id_value").innerHTML = "-";
	updateStatus("Connecting..");
	URL = document.getElementById("producer_url").value;
	var qname = "";
	if (isJoin) {
		qname = document.getElementById("jointext").value;
	}
	establishQueue(function (err, ok) {
		if (err != null) {
			updateStatus(err);
			return;
		}
		// extract the client id
		var parts = ok.split(" clientID=");
		CLIENT_ID = parts[1];
		// ok should contain the receiving queue name from producer
		RECEIVING_QUEUE_NAME = parts[0];
		console.log("[x] Queue established successfully! Reply: '" + ok + "'");
		updateStatus("Connected");
		document.getElementById("session_id_value").innerHTML =
			SENDING_QUEUE_NAME;
		registerKeyListeners();
	}, qname);
}

/**
 * Decides action to take based on key presses in the editing space
 */
function registerKeyListeners() {
	const input = document.getElementById("textSpace");
	// clear input space
	input.value = "";
	// clear fair space
	document.getElementById("fairText").value = "";
}

// window.onload = registerKeyListeners;

// counter to mark the index of the operation from which the server should send
var receive_counter = 0;

/**
 * Receive messages from server at regular intervals
 */
function eventReceiever() {
	if (RECEIVING_QUEUE_NAME == "") return;
	post_data(
		URL,
		{ receiveFrom: receive_counter },
		OPERATION_RECEIVE,
		function (http) {
			if (http.status == ERR_QUEUE_NOT_FOUND) {
				updateStatus(
					"Invalid session ID! (maybe disconnected due to inactivity)"
				);
				document.getElementById("session_id_value").innerHTML = "-";
			} else {
				var bak = document.getElementById("textSpace").value;
				if (http.status == ERR_NO_NEW_OPERATION) {
					//console.log("[!] Error: No new Operation received!");
				} else if (http.status == 200) {
					try {
						var res = JSON.parse(http.response);
						//console.log("[+] Received message from Server --> ");
						//console.log(res);
						if (res.sentFrom < receive_counter) {
							//console.log("[!] Info: Ignoring old changes!");
						} else {
							apply_transformation(res.changesToUpdate);
							receive_counter += res.changesToUpdate.length;
						}
					} catch (err) {
						console.log(
							"Exception thrown: " +
								err.message +
								"\nResponse: " +
								http.response
						);
					}
				} else {
				}
				flushOperations();
			}
		}
	);
}

//var cursorPos = -1;
/**
 * Applies the operation list on fair space text
 */
function apply_transformation(operations) {
	var finaltext = "";
	var text = document.getElementById("fairText").value;
	console.log("Trying to apply: ");
	console.log(operations);
	//var finaltext = document.getElementById("fairText").value;
	for (var i = 0; i < operations.length; i++) {
		// we sent multiple flushes, since each flush resets our
		// operation array, a new range starting with 0 denotes
		// it is part of a later flush.
		if (
			i > 0 &&
			operations[i][0] == 0 &&
			operations[i][1] == 0 &&
			operations[i][2] <= finaltext.length
		) {
			text = finaltext;
			finaltext = "";
		} //Insertion at beginning was wrongly handled by this block
		op = operations[i];
		if (op[0] == 1) {
			finaltext += op[1];
		} else {
			finaltext += text.slice(op[1], op[2]);
		}
	}
	//return finaltext;
	document.getElementById("fairText").value = finaltext;
	document.getElementById("textSpace").value = finaltext;
	//console.log(cursorPos);
	//document.getElementById("textSpace").setSelectionRange(cursorPos, cursorPos);
}

// willLookLike will store the previous version of the rough space (dest)
var willLookLike = "";
var oldOperations = null;

function flushOperations() {
	if (RECEIVING_QUEUE_NAME == "") return;
	var dest = document.getElementById("textSpace").value;
	var source = document.getElementById("fairText").value;
	console.log("source: " + source);
	console.log("wll: " + willLookLike);
	console.log("dest: " + dest);
	if (source == dest) {
		willLookLike = dest;
		return;
	}
	if (willLookLike == dest) return;
	var distanceMatrix = levenshteinDistance(willLookLike, dest);
	var operations = levenshteinOperation(distanceMatrix, willLookLike, dest);
	console.log("[x] Sending: ");
	console.log(operations);
	// console.log(operations);
	//cursorPos = document.getElementById("textSpace").selectionStart;
	if (operations.length > 0) post_data(URL, { operation_list: operations });
	willLookLike = dest;
}

const PING_TIMEOUT_MILLS = 1000 * 1;
setInterval(eventReceiever, PING_TIMEOUT_MILLS);
