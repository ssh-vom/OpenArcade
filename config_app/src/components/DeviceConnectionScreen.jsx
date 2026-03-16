import { useState, useEffect } from "react";
import oaLogo from "../assets/oa-logo.svg";

export default function DeviceConnectionScreen({ onConnect }) {
    const [scanning, setScanning] = useState(true);
    const [deviceFound, setDeviceFound] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setScanning(false);
            setDeviceFound(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-screen h-screen bg-white flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-3xl shadow-[0_2px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-14 max-w-[480px] w-[90%] text-center animate-slide-up">
                {/* Logo */}
                <div className="w-16 h-16 bg-gray-50 rounded-2xl inline-flex items-center justify-center mb-6 border border-gray-100">
                    <img
                        src={oaLogo}
                        alt="OpenArcade"
                        className="w-9 h-9"
                    />
                </div>

                {/* Title */}
                <h1 className="m-0 mb-3 text-[26px] font-semibold text-gray-900 tracking-tight">
                    OpenArcade Configurator
                </h1>

                {/* Subtitle */}
                <p className="m-0 mb-8 text-sm text-gray-500 leading-relaxed">
                    Connect your OpenArcade controller to configure button mappings and module profiles.
                </p>

                {/* Device Status */}
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                    {scanning ? (
                        <div className="flex items-center justify-center gap-3 text-gray-500 text-sm">
                            <div className="w-4 h-4 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" />
                            Scanning for devices...
                        </div>
                    ) : deviceFound ? (
                        <div className="flex items-center gap-3 text-sm animate-fade-in">
                            <div className="w-5 h-5 bg-[#34C759] rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                                ✓
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-gray-900">Controller Found</div>
                                <div className="text-gray-500 text-xs mt-0.5">OpenArcade Controller v1.0</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-red-500 text-sm">
                            No device found
                        </div>
                    )}
                </div>

                {/* Connect Button */}
                <button
                    onClick={async () => {
                        try {
                            setError("");
                            await onConnect();
                        } catch (err) {
                            setError(err?.message || "Failed to connect");
                        }
                    }}
                    disabled={!deviceFound}
                    className={`w-full py-3.5 px-6 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer
                        ${deviceFound
                            ? 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-[0_2px_8px_rgba(0,113,227,0.3)]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                >
                    {deviceFound ? "Connect to Device" : "Waiting for Device..."}
                </button>

                {error && (
                    <div className="mt-3 text-red-500 text-xs">
                        {error}
                    </div>
                )}

                {/* Help Text */}
                <p className="mt-5 mb-0 text-xs text-gray-400">
                    Make sure your controller is powered on and connected via USB
                </p>
            </div>
        </div>
    );
}
