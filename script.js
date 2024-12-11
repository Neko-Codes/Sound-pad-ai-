document.addEventListener("DOMContentLoaded", function () {
    class SoundPadClass {
        constructor(Container, AudioContext, Destination) {
            this.Container = Container;
            this.AudioContext = AudioContext;
            this.Destination = Destination;
            this.CreatePad();
        }

        CreatePad() {
            const PadElement = document.createElement("div");
            PadElement.classList.add("pad");
            PadElement.innerHTML = `
                <input type="file" accept="audio/*" />
                <label>Volume</label>
                <input type="range" class="VolumeSlider" min="0" max="1" step="0.1" value="0.5" />
                <label>Speed</label>
                <input type="range" class="SpeedSlider" min="0.5" max="2" step="0.1" value="1" />
                <label>Loop</label>
                <input type="checkbox" class="LoopCheckbox" />
                <button class="PlayButton">▶</button>
            `;

            const FileInput = PadElement.querySelector('input[type="file"]');
            const VolumeSlider = PadElement.querySelector(".VolumeSlider");
            const SpeedSlider = PadElement.querySelector(".SpeedSlider");
            const LoopCheckbox = PadElement.querySelector(".LoopCheckbox");
            const PlayButton = PadElement.querySelector(".PlayButton");

            let CurrentAudio = null;

            PlayButton.addEventListener("click", () => {
                if (CurrentAudio) {
                    CurrentAudio.Stop();
                }
                this.PlayAudio(
                    FileInput.files[0],
                    parseFloat(VolumeSlider.value),
                    parseFloat(SpeedSlider.value),
                    LoopCheckbox.checked
                ).then(AudioNode => {
                    CurrentAudio = AudioNode;
                });
            });

            FileInput.addEventListener("change", () => {
                if (CurrentAudio) {
                    CurrentAudio.Stop();
                }
                CurrentAudio = null;
            });

            VolumeSlider.addEventListener("input", () => {
                if (CurrentAudio) {
                    CurrentAudio.GainNode.gain.value = parseFloat(VolumeSlider.value);
                }
            });

            SpeedSlider.addEventListener("input", () => {
                if (CurrentAudio) {
                    CurrentAudio.AudioBufferSource.playbackRate.value = parseFloat(SpeedSlider.value);
                }
            });

            this.Container.appendChild(PadElement);
        }

        async PlayAudio(File, Volume, Speed, Loop) {
            if (!File) {
                alert("Please select a sound file to play.");
                return null;
            }

            const ArrayBuffer = await File.arrayBuffer();
            const AudioBuffer = await this.AudioContext.decodeAudioData(ArrayBuffer);

            const GainNode = this.AudioContext.createGain();
            GainNode.gain.value = Volume;

            const AudioBufferSource = this.AudioContext.createBufferSource();
            AudioBufferSource.buffer = AudioBuffer;
            AudioBufferSource.playbackRate.value = Speed;
            AudioBufferSource.loop = Loop;

            AudioBufferSource.connect(GainNode);
            GainNode.connect(this.Destination); // For recording
            GainNode.connect(this.AudioContext.destination); // For playback

            AudioBufferSource.start();

            return {
                AudioBufferSource,
                GainNode,
                Stop: () => AudioBufferSource.stop()
            };
        }
    }

    class AudioRecorderClass {
        constructor(RecordButton, AudioContext, Destination) {
            this.RecordButton = RecordButton;
            this.AudioContext = AudioContext;
            this.Destination = Destination;
            this.MediaRecorder = null;
            this.AudioChunks = [];
            this.IsRecording = false;

            this.SetupRecording();
        }

        SetupRecording() {
            this.RecordButton.addEventListener("click", () => {
                if (this.IsRecording) {
                    this.StopRecording();
                } else {
                    this.StartRecording();
                }
            });
        }

        StartRecording() {
            this.AudioChunks = [];
            this.MediaRecorder = new MediaRecorder(this.Destination.stream);

            this.MediaRecorder.ondataavailable = (event) => {
                this.AudioChunks.push(event.data);
            };

            this.MediaRecorder.onstop = () => {
                this.HandleStop();
            };

            this.MediaRecorder.start();
            this.IsRecording = true;
            this.RecordButton.textContent = "Stop Recording";
        }

        StopRecording() {
            this.MediaRecorder.stop();
            this.IsRecording = false;
            this.RecordButton.textContent = "Record";
        }

        HandleStop() {
            const BlobData = new Blob(this.AudioChunks , { type: "audio/mp3" });
            const Url = URL.createObjectURL(BlobData);
            const Anchor = document.createElement("a");
            Anchor.href = Url;
            Anchor.download = "recording.mp3";
            document.body.appendChild(Anchor);
            Anchor.click();
            document.body.removeChild(Anchor);
        }
    }

    const AudioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
    const Destination = AudioContextInstance.createMediaStreamDestination();

    const Container = document.querySelector(".pad-container");
    const SoundPadInstance = new SoundPadClass(Container, AudioContextInstance, Destination);

    const RecordButton = document.getElementById("record-button"); 
    const AudioRecorderInstance = new AudioRecorderClass(RecordButton, AudioContextInstance, Destination);

    document.getElementById("add-pad").addEventListener("click", () => { 
        SoundPadInstance.CreatePad();
    });
});