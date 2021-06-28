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

/**
 * Computes the change occurred due to a key press
 * @param {string} prev The string before key press
 * @param {string} text The string after key press
 * @param {string} key The pressed key
 * @returns {object} An array of 3 tuples having the type of operation, resulting
 * text and position where change occurred
 */
function getDifference(prev, text, key) {
	var i = 0;
	var j = 0;
	var result = "";
	var type = -1;
	//var locloc
	var pos = -5;
	if (prev.length < text.length) {
		// insertion
		while (j < text.length) {
			if (prev[i] != text[j] || i == prev.length) {
				result += text[j];
				pos = j;
			} else i++;
			j++;
		}
		type = 0; // type = 0 for insertion
	} else if (prev.length > text.length) {
		// deletion
		//console.log(key);
		if (key === "Backspace") {
			//|| key === "Delete") {
			console.log("In Backspace");
			type = -1; // type = -1 for backspace
		}
		if (key === "Delete") {
			console.log("In Delete");
			type = 1; // type = 1 for delete
		}
		while (i < prev.length) {
			if (prev[i] != text[j] || j == text.length) {
				result += prev[i];
				pos = i;
			} else j++;
			i++;
		}
	}
	return [type, result, pos];
}

/**
 * Creates the proper insertion operation format for a given insertion
 * @param {string} txt Text inserted
 * @param {number} loc Starting position of insertion
 */
function generateInsertion(txt, loc) {
	console.log("loc: " + loc);
	var inserted = false;
	if (operation.length == 1 && operation[0][0] == 0 && operation[0][2] == 0) {
		operation.push([1, txt]);
		//console.log(operation);
		return;
	}
	for (let i = 0; i < operation.length; i++) {
		if (operation[i][0] == 0) {
			if (loc >= operation[i][1] && loc <= operation[i][2]) {
				var bak =
					Math.min(
						operation[i][2],
						document.getElementById("fairText").value.length
					) - 1;
				operation[i][2] = loc - 1;
				operation.splice(i + 1, 0, [1, txt]);
				if (loc <= bak) operation.splice(i + 2, 0, [0, loc, bak]);
				inserted = true;
				break;
			}
		}
	}
	if (!inserted) {
		operation.push([1, txt]);
	}
	//console.log(operation);
}

/**
 * Creates the proper deletion operation format for a given deletion
 * @param {number} direction The direction of change (left = -1, right = 1)
 * @param {number} numOfCharsDel Number of characters deleted
 * @param {number} loc The location of deletion
 */
function generateDeletion(direction, numOfCharsDel, loc) {
	var deleted = false;
	for (let i = 0; i < operation.length && !deleted; i++) {
		if (operation[i][0] == 0) {
			if (loc >= operation[i][1] && loc <= operation[i][2]) {
				switch (direction) {
					case -1:
						var bak = Math.max(
							operation[i][2],
							document.getElementById("fairText").value.length
						) - 1;
						if (loc < operation[i][2]) {
							operation.splice(i + 1, 0, [0, loc + 1, bak]);
						}
						operation[i][2] = loc - numOfCharsDel;
						deleted = true;
						break;

					case 1:
						if (loc + numOfCharsDel < operation[i][2]) {
							operation.splice(i + 1, 0, [
								0,
								loc + numOfCharsDel,
								operation[i][2],
							]);
						}
						operation[i][2] = loc - 1;
						deleted = true;
						break;

					default:
						return;
				}
			}
		}
	}
	//console.log(operation);
}

/**
 * Inserts the last consecutive change into the Fair Space
 * @param {string} txt The text to be inserted into Fair Space
 * @param {number} loc The location of insertion
 
function insertIntoFair(txt, loc) {
	var current = document.getElementById("fairText").value;
	var tmp = current.slice(0, loc) + txt + current.slice(loc);
	document.getElementById("fairText").value = tmp;
	console.log(tmp, loc);
}*/

/**
 * Deletes from Fair Space the last consecutive deletion
 * @param {number} direction The direction of change (left = -1, right = 1)
 * @param {number} numOfCharsDel Number of characters deleted
 * @param {number} loc The location of deletion
 
function deleteIntoFair(direction, numOfCharsDel, loc) {
	var current = document.getElementById("fairText").value;
	var tmp = "";
	switch (direction) {
		case -1:
			tmp =
				current.slice(0, loc - numOfCharsDel + 1) +
				current.slice(loc + 1);
			break;
		case 1:
			tmp = current.slice(0, loc) + current.slice(loc + numOfCharsDel);
			console.log("---->>>  ", current.slice(loc + numOfCharsDel));
			break;
		default:
			break;
	}
	document.getElementById("fairText").value = tmp;
	//console.log(tmp, loc);
}*/

/**
 * Sends the last insertion operation to server when a new deletion begins
 * @returns {void}
 */
function instantInsert() {
	if (start == -1) return;
	generateInsertion(insertedChange, start);

	//insertIntoFair(insertedChange, start);
	insertedChange = "";
	prev = "";
	lastChange = -1;
	start = -1;
}

/**
 * Sends the last deletion operation to server when a new insertion begins
 * @returns {void}
 */
function instantDelete() {
	if (deleteCounter == 0) return;
	generateDeletion(lastDeletionDirection, deleteCounter, start);

	//deleteIntoFair(lastDeletionDirection, deleteCounter, start);
	deleteCounter = 0;
	lastChange = -1;
	start = -1;
	lastDeletionDirection = 0;
}

/**
 * Handles an insertion on key press
 * @param {string} change The character inserted
 * @param {number} at The location of insertion
 */
function insertAction(change, at) {
	//console.log(change, at);
	/*console.log(
		"In Insert Action\n",
		change,
		state,
		lastChange,
		at,
		insertedChange
	);*/
	if (state == 1) instantDelete();
	if (at == lastChange + 1) {
		if (insertedChange.length == 0) start = at;
		insertedChange += change;
		prev = insertedChange;
		lastChange = at;
	} else {
		if (start != -1) {
			generateInsertion(insertedChange, start);
		}
		//insertIntoFair(insertedChange, start);
		insertedChange = change;
		prev = insertedChange;
		lastChange = at;
		start = at;
	}

	//console.log("Inserted change :    ", insertedChange, "\nLast change :   ", lastChange);
	//return [insertedChange, lastChange];
	state = 0;
}

/**
 * Handles a deletion on key press
 * @param {string} change The character inserted
 * @param {number} at The location of insertion
 */
function deleteAction(direction, at) {
	//console.log(change, at);
	/*console.log(
		"In Delete Action\n",
		deleteCounter,
		state,
		lastDeletionDirection,
		at,
		direction
	);*/
	if (state == 0) instantInsert();

	if (deleteCounter == 0) {
		start = at;
		deleteCounter++;
		//prev = insertedChange;
		lastChange = at;
		lastDeletionDirection = direction;
	} else if (
		direction == lastDeletionDirection &&
		((direction == 1 && at == lastChange) ||
			(direction == -1 && at == lastChange - 1))
	) {
		deleteCounter++;
		//prev = insertedChange;
		lastChange = at;
		lastDeletionDirection = direction;
	} else {
		if (start != 1) {
			generateDeletion(lastDeletionDirection, deleteCounter, start);
		}
		//deleteIntoFair(lastDeletionDirection, deleteCounter, start);
		deleteCounter = 1;
		lastChange = at;
		start = at;
		lastDeletionDirection = direction;
	}

	//console.log("Inserted change :    ", insertedChange, "\nLast change :   ", lastChange);
	//return [insertedChange, lastChange];
	state = 1;
}

var prev = "";
var insertedChange = "";
var deleteCounter = 0;
var lastDeletionDirection = 0;
var lastChange = -1;
var start = 0;
var state = 0; // 0 = Insertion	1 = Deletion
var operation = []; // Stores the list of suboperations

var SENDING_QUEUE_NAME = "";
var RECEIVING_QUEUE_NAME = "";
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
		// ok should contain the receiving queue name from producer
		RECEIVING_QUEUE_NAME = ok;
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
	// reinit global state
	prev = "";
	insertedChange = "";
	deleteCounter = 0;
	lastDeletionDirection = 0;
	lastChange = -1;
	start = 0;
	state = 0; // 0 = Insertion	1 = Deletion
	// add listeners
	input.addEventListener("keyup", function (event) {
		var text = document.getElementById("textSpace").value;
		const key = event.key; // const {key} = event; ES6+
		var results = [];
		if (key === "Backspace" || key === "Delete") {
			results.push(getDifference(prev, text, key));
			deleteAction(results[0][0], results[0][2]);
			prev = text;
		} else if (event.key.length == 1) {
			results.push(getDifference(prev, text, key));
			insertAction(results[0][1], results[0][2]);
			prev = text;
		}
		//console.log(results);
	});
}

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
			} else if (http.status == ERR_NO_NEW_OPERATION) {
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
				//console.log("[!] Unknown Error: " + http.response);
			}
		}
	);
}

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
		if (i > 0 && operations[i][0] == 0 && operations[i][1] == 0) {
			text = finaltext;
			finaltext = "";
		} //Insertion at beginning was wrongly handled by this block
		op = operations[i];
		if (op[0] == 1) {
			finaltext += op[1];
		} else {
			finaltext += text.slice(op[1], op[2] + 1);
		}
	}
	//return finaltext;
	document.getElementById("fairText").value = finaltext;
	//document.getElementById("textSpace").value = finaltext;
}

function flushOperations() {
	if (RECEIVING_QUEUE_NAME == "") return;
	if (operation.length == 1) return;
	//console.log(operation);
	post_data(URL, { operation_list: operation });
	// apply_transformation();
	operation = [[0, 0, document.getElementById("textSpace").value.length]];
}

const INACTIVE_TIMEOUT_MILLS = 1000 * 1;
const FLUSH_TIMEOUT_MILLS = 1000 * 1;
setInterval(eventReceiever, INACTIVE_TIMEOUT_MILLS);
setInterval(flushOperations, FLUSH_TIMEOUT_MILLS);
