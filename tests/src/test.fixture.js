import Zemu, { DEFAULT_START_OPTIONS, DeviceModel } from '@zondax/zemu';
import Eth from '@ledgerhq/hw-app-eth';
import {RLP} from "ethers/lib/utils";

const transactionUploadDelay = 60000;

async function waitForAppScreen(sim) {
    await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot(), transactionUploadDelay);
}

const sim_options_nano = {
    ...DEFAULT_START_OPTIONS,
    logging: true,
    X11: true,
    startText: 'is ready'
};

const Resolve = require('path').resolve;

const NANOS_ELF_PATH = Resolve('elfs/ethereum_nanos.elf');
const NANOX_ELF_PATH = Resolve('elfs/ethereum_nanox.elf');

const NANOS_CLONE_ELF_PATH = Resolve("elfs/ethereum_classic_nanos.elf");
const NANOX_CLONE_ELF_PATH = Resolve("elfs/ethereum_classic_nanox.elf");

const nano_models: DeviceModel[] = [
    { name: 'nanos', letter: 'S', path: NANOS_ELF_PATH, clone_path: NANOS_CLONE_ELF_PATH },
    { name: 'nanox', letter: 'X', path: NANOX_ELF_PATH, clone_path: NANOX_CLONE_ELF_PATH }
];

const TIMEOUT = 1000000;

// Generates a serializedTransaction from a rawHexTransaction copy pasted from etherscan.
function txFromEtherscan(rawTx) {
    // Remove 0x prefix
    rawTx = rawTx.slice(2);

    let txType = rawTx.slice(0, 2);
    if (txType == "02" || txType == "01") {
        // Remove "02" prefix
        rawTx = rawTx.slice(2);
    } else {
        txType = "";
    }

    let decoded = RLP.decode("0x" + rawTx);
    if (txType != "") {
        decoded = decoded.slice(0, decoded.length - 3); // remove v, r, s
    } else {
        decoded[decoded.length - 1] = "0x"; // empty
        decoded[decoded.length - 2] = "0x"; // empty
        decoded[decoded.length - 3] = "0x01"; // chainID 1
    }

    // Encode back the data, drop the '0x' prefix
    let encoded = RLP.encode(decoded).slice(2);

    // Don't forget to prepend the txtype
    return txType + encoded;
}

function zemu(device, func, start_clone = false) {
    return async () => {
        jest.setTimeout(TIMEOUT);
        let elf_path;
        let lib_elf;
        if (start_clone) {
            elf_path = device.clone_path;
            lib_elf = { 'Ethereum': device.path };
        }
        else {
            elf_path = device.path;
        }
        const sim = new Zemu(elf_path, lib_elf);
        try {
            await sim.start({...sim_options_nano, model: device.name});
            const transport = await sim.getTransport();
            await func(sim, new Eth(transport));
        } finally {
            await sim.close();
        }
    };
}

module.exports = {
    zemu,
    waitForAppScreen,
    sim_options_nano,
    nano_models,
    TIMEOUT,
    txFromEtherscan,
}
