module.exports = {
    getAltName: (domains) => {
        let altNames = [];
        for (let domain in domains)
        {
            let domainData = domains[domain];
            for (let record in domainData) {
                altNames.push(((domainData[record] === '@') ? '' : (domainData[record] + '.')) + domain);
            }
        }
        
        return altNames;
    },
};