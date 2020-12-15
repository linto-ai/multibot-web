window.onload = async function() {
    window.streamingContent = ''
    window.lintoState = 'sleeping'
    window.lintoUISound = new Audio()
    window.MicState = document.getElementById('microphone')

    let mqttConnectHandler = function(event) {
        console.log("MQTT: connected")
    }

    let mqttConnectFailHandler = function(event) {
        console.log("MQTT: failed to connect")
        console.log(event)
    }

    let mqttErrorHandler = function(event) {
        console.log("MQTT: error")
        console.log(event.detail)
    }

    let mqttDisconnectHandler = function(event) {
        console.log("MQTT: Offline")
    }
    let audioSpeakingOn = function(event) {
        // console.log("Speaking")
        window.speaking = 'on'
    }

    let audioSpeakingOff = function(event) {
        // console.log("Not speaking")
        window.speaking = 'off'
        window.MicState.classList.remove('on')
        window.MicState.classList.remove('searching')
        window.MicState.classList.add('muted')
    }

    let commandAcquired = function(event) {
        // console.log("Command acquired", event)
        window.MicState.classList.remove('on')
        window.MicState.classList.remove('muted')
        window.MicState.classList.add('searching')
    }

    let commandPublished = function(event) {
        // console.log("Command published id :", event.detail)
    }

    let hotword = function(event) {
        // console.log("Hotword triggered : ", event.detail)
        window.MicState.classList.remove('searching')
        window.MicState.classList.remove('muted')
        window.MicState.classList.add('on')

        // Play beep sound
        window.lintoUISound.src = '/assets/audio/linto/beep3.wav'
        window.lintoUISound.play()
    }

    let commandTimeout = function(event) {
        // console.log("Command timeout, id : ", event.detail)
    }

    let sayFeedback = async function(event) {
        // console.log("Saying : ", event.detail.behavior.say.text, " ---> Answer to : ", event.detail.transcript)

        window.MicState.classList.remove('searching')
        window.MicState.classList.remove('on')
        window.MicState.classList.add('muted')

        // If no command found
        window.lintoUISound.src = '/assets/audio/linto/beep4.wav'
        window.lintoUISound.play()
        await linto.say(linto.lang, event.detail.behavior.say.text)
    }

    let askFeedback = async function(event) {
        //console.log("Asking : ", event.detail.behavior.ask.text, " ---> Answer to : ", event.detail.transcript)
        await linto.ask(linto.lang, event.detail.behavior.ask.text)
    }

    let streamingChunk = function(event) {
        if (event.detail.behavior.streaming.partial) {
            console.log("Streaming chunk received : ", event.detail.behavior.streaming.partial)
        }
        if (event.detail.behavior.streaming.text) {
            console.log("Streaming utterance completed : ", event.detail.behavior.streaming.text)
        }
    }

    let streamingStart = function(event) {
        console.log("Streaming started with no errors")
    }

    let streamingFinal = function(event) {
        console.log("Streaming ended, here's the final transcript : ", event.detail.behavior.streaming.result)
    }
    let streamingFail = function(event) {
        console.log("Streaming cannot start : ", event.detail)
    }

    let customHandler = async function(event) {
        //console.log(`${event.detail.behavior.customAction.kind} fired`)
        //console.log(event.detail.behavior)
        //console.log(event.detail.transcript)

        // on response from linto : write response in chat area
        if (!!event.detail.behavior.customAction && !!event.detail.behavior.data) {
            if (!!event.detail.behavior.transcript.text) {
                addChatItem('user', event.detail.behavior.transcript.text)
            }
            let kind = ''
            if (!!event.detail.behavior.customAction.kind) {
                kind = event.detail.behavior.customAction.kind
            } else if (!!event.detail.behavior.customAction) {
                kind = event.detail.behavior.customAction
            }
            if ((kind === 'html' || kind === 'html_base64') && !!event.detail.behavior.data.html) {
                addChatItem('bot', event.detail.behavior.data.html)
            }
            if (kind === 'html_form' && !!event.detail.behavior.data.question && !!event.detail.behavior.data.label) {
                addChatItemForm(event.detail.behavior)
            }
            window.MicState.classList.remove('searching')
            window.MicState.classList.remove('on')
            window.MicState.classList.add('muted')
        }
    }

    let addChatItem = function(type, content) {
        const chatArea = document.getElementById('chat-area')
        const chatContent = document.getElementById('chat-content')
        let newContent = `<div class="flex row chat-item ${type}">`
        if (type === 'bot') {
            newContent += `<span class="chat-item--icon chat-item--icon__bot"></span><div class="chat-item--content">${content}</div></div>`

        } else if (type === 'user') {
            newContent += `<div class="chat-item--content">${content}</div>
          <span class="chat-item--icon chat-item--icon__user"></span></div></div>`
        }
        chatContent.innerHTML += newContent
        chatArea.scrollTo(0, chatContent.offsetHeight)
    }
    let addChatItemForm = function(obj) {
        const chatArea = document.getElementById('chat-area')
        const chatContent = document.getElementById('chat-content')
        let newContent = `
        <div class="flex row chat-item bot">
          <span class="chat-item--icon chat-item--icon__bot"></span>
          <div class="chat-item--content">
            <span class="chat-item--form-question">${obj.data.question} :</span>
            <div class="chat-item--form-btns flex row">`
        if (obj.data.label.length > 0) {
            for (let i = 0; i < obj.data.label.length; i++) {
                newContent += `<button class="chat-item--form-btn">${obj.data.label[i]}</button>`
            }
        }
        newContent += '</div></div></div>'
        chatContent.innerHTML += newContent
        chatArea.scrollTo(0, chatContent.offsetHeight)
    }

    window.start = async function() {
        try {
            if (!!window.location.host && window.location.host === 'dev.linto.local:9001') { // LOCAL 
                window.linto = new Linto("https://stage.linto.ai/overwatch/local/web/login", "NkYSkwWQks1oQjmp", 10000)
            } else { // PROD
                window.linto = new Linto("https://stage.linto.ai/overwatch/local/web/login", "PwRfukzKLVxUe2NV", 10000)
            }

            // Some feedbacks for UX implementation
            linto.addEventListener("mqtt_connect", mqttConnectHandler)
            linto.addEventListener("mqtt_connect_fail", mqttConnectFailHandler)
            linto.addEventListener("mqtt_error", mqttErrorHandler)
            linto.addEventListener("mqtt_disconnect", mqttDisconnectHandler)
            linto.addEventListener("speaking_on", audioSpeakingOn)
            linto.addEventListener("speaking_off", audioSpeakingOff)
            linto.addEventListener("command_acquired", commandAcquired)
            linto.addEventListener("command_published", commandPublished)
            linto.addEventListener("command_timeout", commandTimeout)
            linto.addEventListener("hotword_on", hotword)
            linto.addEventListener("say_feedback_from_skill", sayFeedback)
            linto.addEventListener("ask_feedback_from_skill", askFeedback)
                /*linto.addEventListener("streaming_start", streamingStart)
                linto.addEventListener("streaming_chunk", streamingChunk)
                linto.addEventListener("streaming_final", streamingFinal)
                linto.addEventListener("streaming_fail", streamingFail)*/
            linto.addEventListener("custom_action_from_skill", customHandler)

            await linto.login()
            linto.startAudioAcquisition(true, "linto", 0.99) // Uses hotword built in WebVoiceSDK by name / model / threshold (0.99 is fine enough)
            linto.startCommandPipeline()

            return true
        } catch (e) {
            console.log(e)
            return e.message
        }
    }

    start()
}