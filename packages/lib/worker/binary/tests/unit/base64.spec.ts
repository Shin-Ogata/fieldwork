import { Base64 } from '@cdp/binary';

describe('binary/base64 spec', () => {
    it('check Base64#encode() / decode()', () => {
        let encoded = Base64.encode('ASCII only');
        let decoded = Base64.decode(encoded);
        expect(decoded).toBe('ASCII only');

        encoded = Base64.encode('おつかれさまです。');
        decoded = Base64.decode(encoded);
        expect(decoded).toBe('おつかれさまです。');
    });
});
