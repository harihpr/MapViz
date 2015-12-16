$(document).ready(function() {
    var clicks = [], gp = [], mc = [], cost = [], hotels = [];
    var countryData = {};
    var markers, selectedCountry;
    colorScaleClicks = chroma.scale(['#ff3333', '#ffff00', '#00ff00']).domain([1,40],15,'log');
    colorScaleGP = chroma.scale(['#ff3333', '#ffff00', '#00ff00']).domain([1,150],30,'log');
    colorScaleMCRed = chroma.scale(['#ff8585', '#cc0000']).domain([1,100],20,'log');
    colorScaleMCGreen = chroma.scale(['#85ff85', '#22cc00']).domain([1,100],20,'log');
    colorScaleEfficiency = chroma.scale(['#00ff00', '#ffff00', '#ff3333']).domain([1,3],15,'log');

    var map = L.map("map", {zoomControl: false}).setView([20,0], 2);
    L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        minZoom: 2,
        maxZoom: 18,
        ext: 'png'
    }).addTo(map);

    L.TopoJSON = L.GeoJSON.extend({  
        addData: function(jsonData) {    
            if (jsonData.type === "Topology") {
                for (key in jsonData.objects) {
                    geojson = topojson.feature(jsonData, jsonData.objects[key]);
                    L.GeoJSON.prototype.addData.call(this, geojson);
                }
            }    
            else {
                L.GeoJSON.prototype.addData.call(this, jsonData);
            }
        }
    });

    var topoLayer = new L.TopoJSON();
    var $tooltip = $('.country-details');

    d3.tsv("DataFile.tab", function(data) {
        clicks = d3.nest()
            .key(
                function(d) {
                    return d.COUNTRY_CODE;
                })
            .sortKeys(d3.ascending)
            .rollup(
                function(d) {
                    return d3.sum(d, function(g){return parseInt(g['30D_CLICKS']);})
                })
            .entries(data);
        gp = d3.nest()
            .key(
                function(d) {
                    return d.COUNTRY_CODE;
                })
            .sortKeys(d3.ascending)
            .rollup(
                function(d) {
                    return d3.sum(d, function(g){return parseFloat(g['30D_GP']);}).toFixed(3);
                })
            .entries(data);
        mc = d3.nest()
            .key(
                function(d) {
                    return d.COUNTRY_CODE;
                })
            .sortKeys(d3.ascending)
            .rollup(
                function(d) {
                    return d3.sum(d, function(g){return parseFloat(g['30D_MC']);}).toFixed(3);
                })
            .entries(data);
        cost = d3.nest()
            .key(
                function(d) {
                    return d.COUNTRY_CODE;
                })
            .sortKeys(d3.ascending)
            .rollup(
                function(d) {
                    return d3.sum(d, function(g){return parseFloat(g['30D_COST']);}).toFixed(3);
                })
            .entries(data);
        hotels = d3.nest()
            .key(
                function(d) {
                    return d.COUNTRY_CODE;
                })
            .sortKeys(d3.ascending)
            .rollup(
                function(d) {
                    var htl = [];
                    d.forEach(function(g) {
                        htl.push([g['HOTEL_ID'], g['30D_CLICKS'], g['30D_GP'], g['30D_MC'], g['LATITUDE'], g['LONGITUDE'], g['COUNTRY_CODE']])
                    });
                    return htl;
                })
            .entries(data);

        $.getJSON('world-topo-min.json').done(addTopoData);
    });

    function addTopoData(topoData){  
        topoLayer.addData(topoData);
        topoLayer.addTo(map);
        $("input[name='optionRadio']").click(function() {
            topoLayer.eachLayer(handleLayer);
        });
    };

    function handleLayer(layer){
        var countryName = layer.feature.properties.name;
        var countryCode = countries[countryName] ? countries[countryName] : 'XX';
        var noOfClicks = getNoOfClicks(countryCode);
        var sumOfGP = getSumOfGP(countryCode);
        var sumOfMC = getSumOfMC(countryCode);
        var sumOfCost = getSumOfCost(countryCode);
        var noOfHotels = getNoOfHotels(countryCode);
        countryData[countryName] = [noOfClicks, sumOfGP, sumOfMC, sumOfCost, noOfHotels];

        switch($("input[name='optionRadio']:checked").val()) {
            case 'gp':
                fillColor = (noOfHotels===0 || countryCode==='XX') ? '#ffffff' : colorScaleGP(sumOfGP/noOfHotels).hex();
                break;
            case 'mc':
                fillColor = (noOfHotels===0 || countryCode==='XX') ? '#ffffff' : (sumOfMC<0 ? colorScaleMCRed(-(sumOfMC)/noOfHotels).hex() : colorScaleMCGreen(sumOfMC/noOfHotels).hex());
                break;
            case 'efficiency':
                fillColor = (sumOfCost==0 || countryCode==='XX' || sumOfGP==0) ? '#ffffff' : colorScaleEfficiency((sumOfGP/sumOfCost)+1).hex();
                break;
            default:
                fillColor = (noOfHotels===0 || countryCode==='XX') ? '#ffffff' : colorScaleClicks((noOfClicks/noOfHotels)+1).hex();
                break;
        }

        layer.setStyle({
            fillColor : fillColor,
            fillOpacity: 0.55,
            color:'#555',
            weight:1,
            opacity:0.5
        });

        layer.on({
            mouseover: enterLayer,
            mouseout: leaveLayer,
            click: showLayerDetail
        });
    };

    function getNoOfClicks(countryCode) {
        for(var i=0; i<clicks.length; i++) {
            if(countryCode===clicks[i]['key']) {
                return clicks[i]['values'];
            }
        };
        return 0;
    };

    function getSumOfGP(countryCode) {
        for(var i=0; i<gp.length; i++) {
            if(countryCode===gp[i]['key']) {
                return gp[i]['values'];
            }
        };
        return 0;
    };

    function getSumOfMC(countryCode) {
        for(var i=0; i<mc.length; i++) {
            if(countryCode===mc[i]['key']) {
                return mc[i]['values'];
            }
        };
        return 0;
    };

    function getSumOfCost(countryCode) {
        for(var i=0; i<cost.length; i++) {
            if(countryCode===cost[i]['key']) {
                return cost[i]['values'];
            }
        };
        return 0;
    };

    function getNoOfHotels(countryCode) {
        for(var i=0; i<hotels.length; i++) {
            if(countryCode===hotels[i]['key']) {
                return hotels[i]['values'].length;
            }
        };
        return 0;
    };

    function getHotelsLocation(countryCode) {
        for(var i=0; i<hotels.length; i++) {
            if(countryCode===hotels[i]['key']) {
                return hotels[i]['values'];
            }
        };
        return 0;
    };

    function enterLayer() {
        var countryName = this.feature.properties.name;
        switch($("input[name='optionRadio']:checked").val()) {
            case 'gp':
                var gpPerHotel = countryData[countryName][4] ? (countryData[countryName][1]/countryData[countryName][4]).toFixed(3) : '0';
                $tooltip.html('<strong>'+countryName+'</strong><br><br>Sum of GP - <strong>'+countryData[countryName][1]+'</strong><br>Number of Hotels - <strong>'+countryData[countryName][4]+'</strong><br>GP per Hotel - <strong>'+gpPerHotel+'</strong>').show();
                break;
            case 'mc':
                var mcPerHotel = countryData[countryName][4] ? (countryData[countryName][2]/countryData[countryName][4]).toFixed(3) : '0';
                $tooltip.html('<strong>'+countryName+'</strong><br><br>Sum of MC - <strong>'+countryData[countryName][2]+'</strong><br>Number of Hotels - <strong>'+countryData[countryName][4]+'</strong><br>MC per Hotel - <strong>'+mcPerHotel+'</strong>').show();
                break;
            case 'efficiency':
            var efficiency = countryData[countryName][4] ? (countryData[countryName][1]/countryData[countryName][3] * 100).toFixed(3) : '0';
            $tooltip.html('<strong>'+countryName+'</strong><br><br>Sum of GP - <strong>'+countryData[countryName][1]+'</strong><br>Sum of Cost - <strong>'+countryData[countryName][3]+'</strong><br>Efficiency - <strong>'+efficiency+'%</strong>').show();
            break;
            default:
                var clicksPerHotel = countryData[countryName][4] ? (countryData[countryName][0]/countryData[countryName][4]).toFixed(3) : '0';
                $tooltip.html('<strong>'+countryName+'</strong><br><br>Number of Clicks - <strong>'+countryData[countryName][0]+'</strong><br>Number of Hotels - <strong>'+countryData[countryName][4]+'</strong><br>Clicks per Hotel - <strong>'+clicksPerHotel+'</strong>').show();
                break;
        }

        this.bringToFront();
        this.setStyle({
            weight:2,
            opacity: 1
        });
    };

    function leaveLayer() {  
        $tooltip.hide();

        this.bringToBack();
        this.setStyle({
            weight:1,
            opacity:.5
        });
    };

    function showLayerDetail() {
        var countryName = this.feature.properties.name;
        var countryCode = countries[countryName] ? countries[countryName] : 'XX';
        var loc = getHotelsLocation(countryCode);

        map.fitBounds(this.getBounds());
        $('.back').show();
        $('.country-details').show();

        markers = new L.MarkerClusterGroup({ 
            chunkedLoading: true,
            spiderfyOnMaxZoom: false,
            maxClusterRadius: 150,
            iconCreateFunction: defineClusterIcon
        });

        customMarker = L.Marker.extend({
           options: {
               HOTEL_ID: 0,
              CLICKS: 0,
              GP: 0.000,
              MC: 0.000
           }
        });

        for (var i=0; i<loc.length; i++) {
            var clickColor = loc[i][1]<25 ? '#ff8585' : '#85ff85';
            var gpColor = loc[i][2]<2 ? '#ff8585' : '#85ff85';
            var mcColor = loc[i][3]<=0 ? '#ff8585' : '#85ff85';
            var icon = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' width='40' height='40'><circle cx='20' cy='20' r='19' fill='"+mcColor+"' stroke='black' stroke-width='1' /><circle cx='20' cy='20' r='14' fill='"+gpColor+"' stroke='black' stroke-width='1' /><circle cx='20' cy='20' r='8' fill='"+clickColor+"' stroke='black' stroke-width='1' /></svg>";
            var svgURL = "data:image/svg+xml;base64," + btoa(icon);
            var svgIcon = L.icon({
                iconUrl: svgURL,
                iconSize: [40, 40]
            });

            var marker = new customMarker([loc[i][4], loc[i][5]], {
                icon: svgIcon,
                HOTEL_ID: loc[i][0],
                CLICKS: loc[i][1],
                GP: loc[i][2],
                MC: loc[i][3],
                COUNTRY_CODE: loc[i][6]
            }).bindPopup('Hotel Id - '+loc[i][0]+'<br>MC - '+loc[i][3]+'<br> GP - '+loc[i][2]+'<br> Clicks - '+loc[i][1]).openPopup();

            markers.addLayer(marker);
        };
        map.addLayer(markers);

        function defineClusterIcon(cluster) {
            var children = cluster.getAllChildMarkers(),
                data = d3.nest()
                        .rollup(
                            function(d) {
                                return [d3.sum(d, function(g){return g['options']['CLICKS'];}),
                                        d3.sum(d, function(g){return parseFloat(g['options']['GP']);}).toFixed(3),
                                        d3.sum(d, function(g){return parseFloat(g['options']['MC']);}).toFixed(3)
                                        ]
                            })
                        .entries(children);
            var clickColor = data[0]<25 ? '#ff8585' : '#85ff85';
            var gpColor = data[1]<2 ? '#ff8585' : '#85ff85';
            var mcColor = data[2]<0 ? '#ff8585' : '#85ff85';
            var icon = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' width='60' height='60'><rect x='0' y='0' height='60' width='60' fill='"+mcColor+"' stroke='black' stroke-width='1' /><rect x='10' y='10' height='40' width='40' fill='"+gpColor+"' stroke='black' stroke-width='1' /><rect x='20' y='20' height='20' width='20' fill='"+clickColor+"' stroke='black' stroke-width='1' /><text x='20' y='35' fill='black' font-weight='bold'>"+children.length+"</text></svg>";

            return new L.DivIcon({
                html: icon,
                iconSize: [60, 60]
            });
        }
    };

    $('.back').click(function() {
        map.setView([20,0], 2);
        $('.back').hide();
        $('.country-details').hide();

        markers.clearLayers();
        map.removeLayer(markers);
    });
});
