mapboxgl.accessToken = "pk.eyJ1IjoiY2lsdSIsImEiOiJjanlnc3VvZHQwNDdvM2NzMWRwazF5bHJnIn0.HpN9uKnXt0WC6hUPLB7Dag";

//Defining the basemap styles
const bsmp = "mapbox://styles/cilu/cl0z83h11004q14peo7ev1vdd"; //=byyear
//Loading the background layer on the map. This is a customised basemap, a "style" in Mapbox Studio
const map = new mapboxgl.Map({
  container: "map",
  style: bsmp,
  center: [24, 46.2],
  maxZoom: 12,
  minZoom: 3,
});
map.on('load', () => {
  //Fitting the map bounds for the extent of the stations, so all of them would be visible at first, regardless of the screen size
  map.fitBounds([
    [20, 44.2],
    [28, 48.2]
  ]);
 
  // Make a pointer cursor
  map.getCanvas().style.cursor = "default";
  
  //Loading elevation data for the additional hillshade
  map.addSource('dem', {
    'type': 'raster-dem',
    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1'
  });
  map.addLayer({
    id: 'hillshading',
    source: 'dem',
    type: 'hillshade',
    //Giving the hillshade some vintage-looking colours
    paint: {
      "hillshade-shadow-color": "rgb(20, 36, 15)",
      "hillshade-highlight-color": "rgb(255, 219, 102)",
      "hillshade-exaggeration": 0.9
    }
  });
});

//Navigation buttons
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

//Scale
const scale = new mapboxgl.ScaleControl({
  maxWidth: 150, //size of the scale bar
  unit: "metric"
});
map.addControl(scale);

//FUNCTION FOR LOADING THE CORRECT DATASET
function dataload(map, data_url){
  fetch(data_url)
    .then(response => response.json())
    .then(data => {
      //Adding the data points to the basemap
			let paint_att
			if (allyear.checked == true) {
				paint_att = {
          'circle-radius': [
            'interpolate', ['linear'],
            ['to-number', ['get', 'Months_temp']],
            1, 6,
            564, 20,
          ],
          'circle-color': 'rgb(114, 0, 0)',
          'circle-opacity': 0.7
				}
			}
			else {
				paint_att = {
          'circle-radius': [
            'interpolate', ['linear'],
            ['to-number', ['get', 'temp']],
            1, 5,
            12, 20,
          ],
          'circle-color': 'rgb(152, 44, 5)',
          'circle-opacity': 0.8
				}
			}
			
      map.addLayer({
        id: 'Temp3',
        type: 'circle',
        source: {
          type: 'geojson',
          data: data
        },
        //Symbolizing the points based on the number of months
				paint: paint_att
      });
			//sorting if necessary
			var byyear = document.getElementById("byyear");
			//console.log(byyear.checked);
			if (byyear.checked == true) {
				var filterYear = ['==', ['get', 'Year'], '1871'];
    	  map.setFilter('Temp3', ['all', filterYear]);
			}
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
};

//FUNCTION FOR HOVERING INTERACTION
var monthsprop = "Months_temp";
function hovering(map, monthsprop){
	map.on('load', () => {
		map.addSource("hover", {
			type: "geojson",
			data: { type: "FeatureCollection", features: [] }
		});
		map.addLayer({
			id: "dz-hover",
			type: "circle",
			source: "hover",
			layout: {},
			paint: {
				"circle-radius": 4,
				"circle-opacity": 0,
				"circle-stroke-width":3,
				"circle-stroke-color": "rgb(255, 230, 230)"
			}
		});
	});
	
	//Hovering interaction
	map.on('mousemove', (event) => {
		const station = map.queryRenderedFeatures(event.point, {
			layers: ['Temp3']
		});
		document.getElementById('pd').innerHTML = station.length
		? `<h2><b>${station[0].properties.Name}:</b></h2><h3>${station[0].properties[monthsprop]} months of data</h3>`
		: `<p><i>(Hover over a station!)</i></p>`;
		map.getSource("hover").setData({
			type: "FeatureCollection",
			features: station.map(function (f) {
				return { type: "Feature", geometry: f.geometry };
			})
		});
		map.moveLayer('Temp3', 'dz-hover'); //moving hover layer in front
	});
};

//FUNCTION FOR TIME SLIDER INTERACTION
function timeslider(map){
	//Filtering data based on the timeslider
	const slider = document.getElementById("slider");
	slider.addEventListener('input', (event) => {
		//Get the year value from the slider
		const year = parseInt(event.target.value);
		//Create a filter
		const syear = year.toString();
		filterYear = ['==', ['get', 'Year'], syear];
		//set the map filter
		map.setFilter('Temp3', ['all', filterYear]);
		// Update text on the slider
		//document.getElementById('active-year').innerText = year;
	});
	
	//Formatting the timeslider
	const slidLabel = document.getElementById("slidLabel");
	const setLabel = () => {
		//Calculating the thumb's position on the slider
		const newLabel = Number((slider.value - slider.min) * 100 / (slider.max - slider.min));
		const labelPos = 12.5 - newLabel * 0.25;
		//const labelPos = newLabel * 1.25;
		slidLabel.innerHTML = `<span>${slider.value}</span>`;
		//slidLabel.style.removeProperty('left');
		slidLabel.style.left = `calc(${newLabel}% + (${labelPos}px))`;
		//slidLabel.style.left = `${labelPos}%`;
	};
	document.addEventListener("DOMContentLoaded", setLabel);
	slider.addEventListener('input', setLabel);
};

//LOADING DATA FOR DEFAULT OPTION, ADDING HOVERING INTERACTION
//Convert point data to GeoJson
let data_url =
        "https://api.mapbox.com/datasets/v1/cilu/cl10xcw0t3sul21r0bg51tdbv/features?access_token=pk.eyJ1IjoiY2lsdSIsImEiOiJjanlnc3VvZHQwNDdvM2NzMWRwazF5bHJnIn0.HpN9uKnXt0WC6hUPLB7Dag";
dataload(map, data_url);
hovering(map, monthsprop);

//TWO OPTIONS
//Getting the value from the menu
const layerList = document.getElementById("menu");
const inputs = layerList.getElementsByTagName("input");

//Toggle styles
for (const input of inputs) {
	
  input.onclick = (layer) => {
		//Removing the previous layer from the map
		map.removeLayer("Temp3");
		map.removeSource("Temp3");
		map.fitBounds([
    	[20, 44.2],
    	[28, 48.2]
  	]);
    if (layer.target.id == "allyear") {
			//console.log("hello");
			document.getElementById('console').style.display = "none";
			//Specify the correct data reference (layer), converting it to GeoJson
			data_url = "https://api.mapbox.com/datasets/v1/cilu/cl10xcw0t3sul21r0bg51tdbv/features?access_token=pk.eyJ1IjoiY2lsdSIsImEiOiJjanlnc3VvZHQwNDdvM2NzMWRwazF5bHJnIn0.HpN9uKnXt0WC6hUPLB7Dag";
			
			var monthsprop = "Months_temp";
			dataload(map, data_url);
		}
		
    else if (layer.target.id == "byyear") {
			//console.log("mukoggyeeeeee");
			document.getElementById('console').style.display = "block";
			//Specify the correct data reference (layer), converting it to GeoJson
			data_url = "https://api.mapbox.com/datasets/v1/cilu/cl117tr7a046722mpcyttoul4/features?access_token=pk.eyJ1IjoiY2lsdSIsImEiOiJjanlnc3VvZHQwNDdvM2NzMWRwazF5bHJnIn0.HpN9uKnXt0WC6hUPLB7Dag";
			dataload(map, data_url);
			
			timeslider(map);
			var monthsprop = "temp";
		}
		hovering(map, monthsprop);
  }
}