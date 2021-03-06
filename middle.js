var async = require('async');
var request = require('request');
var _ = require('underscore');
var ent = require('ent');
var url = 'https://wootalk.today/';
var WebSocket = require('ws');
var sleep = require('sleep');
var say = require('say');
var wootalk_header = {
	'Host': 'wootalk.today',
	'Origin': 'https://wootalk.today',
	'Cache-Control': 'no-cache',
	'Pragma': 'no-cache',
	'Connection': 'Upgrade',
	'Upgrade': 'websocket',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36',
	'Sec-WebSocket-Version': 13,
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,zh-CN;q=0.2'
};
var Randomize = function() {
	return Math.floor((Math.random() * 100000) + 50000);
};

var cha = '["clickStartChat()",{}]';
var leavecmd = '["changePerson()",{}]';

/* 
	for showing ID for the first time to check the user
*/
var flagA_first=true;
var flagB_first=true;

async.parallel([
	function(cb) {
		sleep.sleep(1);
		request.get(url, function(error, response, body) {
			var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];
			cb(null, session);
		});
	},
	function(cb) {
		sleep.sleep(1);
		request.get(url, function(error, response, body) {
			var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];
			cb(null, session);
		});
	}
], function(err, results) {

	wsA = SocketCreate(results[0]);
	wsB = SocketCreate(results[1]);

	var userId_A = null;
	var userId_B = null;


	//	to kick the user out 	
	var flagA = false;


	
	process.stdin.setEncoding('utf8');
	process.stdin.on('readable', function(){
		var input = process.stdin.read();
		//var temp;
		var fakeMessage;
		

		//var sample = ["new_message",{"id":null,"channel":null,"user_id":845609,"data":{"sender":1,"message":"å®å®","time":1431750704164,"msg_id":1},"success":null,"result":null,"token":null,"server_token":null}];
		var sample = ["new_message",{"id":null,"channel":null,"user_id":876225,"data":{"sender":1,"message":"對","time":1431952068796,"mobile":null},"success":null,"result":null,"token":null,"server_token":null}];
		if(input){
			var sendToWho = input.substring(0, 3);
			var content =  input.substring(4, input.length-1);
		}
		if(sendToWho == 'end'){
			console.log('process.exit()');
			process.exit();
		}else if(sendToWho == 'toa' && userId_A){
			console.log('發話給A用的user_id: '+userId_A);
				console.log('代替輸入send to A: '+content);
				sample[1]['user_id'] = userId_A;
				sample[1]['data']['message'] = content;
				fakeMessage = JSON.stringify(sample);
				//console.log(fakeMessage);
				wsA.send(fakeMessage);
			
		}else if(sendToWho == 'tob' && userId_B){
			console.log('發話給B用的user_id: '+userId_B);
			
				console.log('代替輸入send to B: '+content);
				sample[1]['user_id'] = userId_B;
				sample[1]['data']['message'] = content;
				fakeMessage = JSON.stringify(sample);
				//console.log(fakeMessage);
				wsB.send(fakeMessage);
			

			
		}else if(sendToWho === 'zzz'){
			
			console.log("kick all");
			flagA = true;

		}
		else if(sendToWho === 'xxx'){
			
			console.log("recover");
			flagA = false;

		}
		else if(sendToWho === 'cha'){
			wsA.send(leavecmd);
			wsA.send(cha);
			wsB.send(leavecmd);
		}

		// else if(sendToWho === 'tka'){
			
		// 	console.log("talk to a");
		// 	wsB.close();

		// }

		else{

			console.log('尚未取得足夠對話參數');
		}
	});


	wsA.on('open', function() {
		console.log('A connected!');
	});
	// wsA.on('close', function close(){

	// 	console.log('A disconnected');
	// 	wsB.close();

	// });

	wsA.on('message', function(message) {
		//console.log(message)
		var pa = JSON.parse(message)[0]; //parse
		console.log(pa);
		console.log(pa[1]['data']);
		var ev = pa[0]; //event名字
		/*
			client_connected, new_message, websocket_rails.ping, update_state
		*/
		if(pa[1]['data']['message']){//avoid undefined
			pa[1]['data']['message'] = ent.decode(pa[1]['data']['message']);//html entity
		}
		var msg = pa[1]['data']['message'];
		var sender = pa[1]['data']['sender']; //0 是系統, 1是自己, 2是對方
		var leave = pa[1]['data']['leave']; //若對方leave, 要寄給系統["change_person",{}]
		if (ev == 'client_connected') {
			userId_A = pa[1]['data'].connection_id;
		}
		if (ev == 'new_message') {

			// if( pa[1]['user_id'] ){
			// 	userId_A = pa[1]['user_id'];//取得和A之間的user_id

			// 	if (flagA_first){
			// 		console.log('Aid: '+userId_A);
			// 		flagA_first=false;
			// 	}
			//}
			pa[1]['data']['sender'] = 1; //使系統知道是我要傳給對方
			message = JSON.stringify(pa);
			if (sender == 2) {
				console.log("A：「 " + msg + " 」");
				//say.speak('Ting-Ting', msg);
				//console.log(message);
				if(flagA==false){
					wsB.send(message);
				}
			} else if (!sender && leave) {
				//leave == false 是初始系統提示訊息的時候, 其餘時候都是undefined
				//change person 或 disconnected
				//
				console.log('A 已經離開房間');

				//wsA.send(leavecmd);
				//wsB.send(leavecmd);

				//wsA.close();
			}
		} else if (ev == 'update_state') {

			if (pa[1]['data']['typing']) {
				//console.log('A typing...');
			}
			if (pa[1]['data']['last_read']) {
				//console.log('A 已讀');
			}
			wsB.send(message);


		}else if (ev == 'websocket_rails.ping') {
			a = Randomize();
			wsA.send('["websocket_rails.pong",{"id":' + Randomize() + ',"data":{}}]')
		} else if (ev == 'client_connected') {
			console.log('A 已進入房間')

		}
	});

	



	wsB.on('open', function() {
		console.log('B connected!');
	});
	// wsB.on('close', function close() {
	// 	console.log('B disconnected');
	// });
	wsB.on('message', function(message) {
		var pa = JSON.parse(message)[0]; //parse
		var ev = pa[0]; //event名字
		/*
			client_connected, new_message, websocket_rails.ping, update_state
		*/
		if(pa[1]['data']['message']){//avoid undefined
			pa[1]['data']['message'] = ent.decode(pa[1]['data']['message']);//html entity
		}
		var msg = pa[1]['data']['message'];
		var sender = pa[1]['data']['sender']; //0 是系統, 1是自己, 2是對方
		var leave = pa[1]['data']['leave']; //若對方leave, 要寄給系統["change_person",{}]
		if (ev == 'client_connected') {
			userId_B = pa[1]['data'].connection_id;
		}
		if (ev == 'new_message') {
			// if( pa[1]['user_id'] ){
			// 	userId_B = pa[1]['user_id'];//取得和B之間的user_id
			// 	if (flagB_first){
			// 		console.log('Bid: '+userId_B);
			// 		flagB_first=false;
			// 	}
			// }
			pa[1]['data']['sender'] = 1; //使系統知道是我要傳給對方
			message = JSON.stringify(pa);
			if (sender == 2) {
				console.log("B：「 " + msg + " 」\n");
				//say.speak('Sin-ji', msg);
				//console.log(message);
				if (flagA == false){
					wsA.send(message);
				}
			} else if (!sender && leave) {
				//leave == false 是初始系統提示訊息的時候, 其餘時候都是undefined
				//change person 或 disconnected
				console.log('B 已經離開房間');
				// wsA.send(changePerson());

				// wsA.send(leavecmd);
				// wsB.send(leavecmd);
			}
		} else if (ev == 'update_state') {
			if (pa[1]['data']['typing']) {
				//console.log('B typing...');
			}
			if (pa[1]['data']['last_read']) {
				//console.log('B 已讀');
			}
			wsA.send(message);


		} else if (ev == 'websocket_rails.ping') {
			a = Randomize();
			wsB.send('["websocket_rails.pong",{"id":' + Randomize() + ',"data":{}}]')

		} else if (ev == 'client_connected') {
			console.log('B 已進入房間');
			// wsB.send('["new_message",{"id":70527,"data":{"message":"嗨","msg_id":1}}]')
		}
	});



});




function SocketCreate(result){
	return new WebSocket('wss://wootalk.today/websocket', [], {
		headers: _.extend(wootalk_header, {
			'Cookie': '_gat=1; _wootalk_session=' + result + '; _ga=GA1.2.1804571589.1429605824; __asc=6c4424fc14ce5fe7639ea11437a; __auc=c71404c914cdb259f913b23fc5b'
		})
	});
}