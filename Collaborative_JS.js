const OPERATION_CREATE = "create";
const OPERATION_SEND = "send";
const OPERATION_JOIN = "join";
const OPERATION_GET_MSG = "receive";

const ERR_QUEUE_NAME_NOT_SPECIFIED = 460;
const ERR_START = ERR_QUEUE_NAME_NOT_SPECIFIED;
const ERR_OPERATION_NAME_NOT_SPECIFIED = 461;
const ERR_RESERVED_QUEUE_NAME = 462;
const ERR_QUEUE_IN_USE = 463;
const ERR_QUEUE_NOT_FOUND = 464;
const ERR_INVALID_OPERATION = 465;

// by default, operation is send, so the status handler
// handles what would happen if the queue is not
// found while sending data, which inevitably means
// disconnection.
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
	console.log(data);
	//Send the proper header information along with the request
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	http.send(params);
	//window.open(url);
}

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

function insertIntoFair(txt, loc) {
	var current = document.getElementById("fairText").value;
	var tmp = current.slice(0, loc) + txt + current.slice(loc);
	document.getElementById("fairText").value = tmp;
	console.log(tmp, loc);
}

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
}

function instantInsert() {
	if (start == -1) return;
	post_data(URL, {
		changeType: "insertion",
		insertedText: insertedChange,
		startLoc: start,
	});
	insertIntoFair(insertedChange, start);
	insertedChange = "";
	prev = "";
	lastChange = -1;
	start = -1;
}

function instantDelete() {
	if (deleteCounter == 0) return;
	post_data(URL, {
		changeType: "deletion",
		deletionDirection: lastDeletionDirection,
		startLoc: start,
		NumberOfCharatersDeleted: deleteCounter,
	});
	deleteIntoFair(lastDeletionDirection, deleteCounter, start);
	deleteCounter = 0;
	lastChange = -1;
	start = -1;
	lastDeletionDirection = 0;
}

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
			post_data(URL, {
				changeType: "insertion",
				insertedText: insertedChange,
				startLoc: start,
			});
		}
		insertIntoFair(insertedChange, start);
		insertedChange = change;
		prev = insertedChange;
		lastChange = at;
		start = at;
	}

	//console.log("Inserted change :    ", insertedChange, "\nLast change :   ", lastChange);
	//return [insertedChange, lastChange];
	state = 0;
}

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
			post_data(URL, {
				changeType: "deletion",
				deletionDirection: lastDeletionDirection,
				startLoc: start,
				NumberOfCharatersDeleted: deleteCounter,
			});
		}
		deleteIntoFair(lastDeletionDirection, deleteCounter, start);
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

var SENDING_QUEUE_NAME = "";
var RECEIVING_QUEUE_NAME = "";
var URL = "";
const QUEUE_NAME_LENGTH = 64;
// dec2hex :: Integer -> String
// i.e. 0-255 -> '00'-'ff'
function dec2hex(dec) {
	return dec.toString(16).padStart(2, "0");
}

// generateId :: Integer -> String
function generateId(len) {
	var arr = new Uint8Array((len || 40) / 2);
	window.crypto.getRandomValues(arr);
	return Array.from(arr, dec2hex).join("");
}

const MAX_RETRY = 10;

function updateStatus(text) {
	document.getElementById("connection_status").innerHTML = text;
}

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
