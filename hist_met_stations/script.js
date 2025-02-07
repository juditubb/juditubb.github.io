// Mapbox Access Token
mapboxgl.accessToken = "pk.eyJ1IjoiY2lsdSIsImEiOiJjanlnc3VvZHQwNDdvM2NzMWRwazF5bHJnIn0.HpN9uKnXt0WC6hUPLB7Dag";

// Initializing variables
let data_url
let source_layer
let maindata
let maindatatx
let maindataval
let datacolor
let circlerad

// Default values for some variables
data_url = "cilu.cm5pi8yes3ly81no72vkow5ac-622i2"; //Tileset ID for default tileset
source_layer = "stations_overview";
maindata = "data_count";
maindatatx = "";
datacolor = "rgb(110, 24, 41)";

// Defining the basemap style
const bsmp = "mapbox://styles/cilu/cl0z83h11004q14peo7ev1vdd";

// Defining initial bounds for the extent of the stations, so all of them would be visible at first, regardless of the screen size. The zoom level is automatically set so that the given bounding box is fully visible in the viewport.
const initbounds = [
  [13.6, 44], // Southwest corner (lng, lat)
  [27, 49.8]  // Northeast corner (lng, lat)
];

// Defining the map object
const map = new mapboxgl.Map({
  container: "map",
  style: bsmp,
  maxZoom: 12,
  minZoom: 3,
});

// Fitting the map bounds 
map.fitBounds(initbounds);

// Loading the background layer on the map. This is a customised basemap, a "style" in Mapbox Studio
// Ensure code only runs when the map has already been loaded
map.on('load', () => { 
  // Make a pointer cursor
  map.getCanvas().style.cursor = "default";
  // Loading elevation data for the additional hillshade
  map.addSource('dem', {
    'type': 'raster-dem',
    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1'
  });
  map.addLayer({
    id: 'hillshading',
    source: 'dem',
    type: 'hillshade',
    // Giving the hillshade some vintage-looking colours
    paint: {
      "hillshade-shadow-color": "rgb(20, 36, 15)",
      "hillshade-highlight-color": "rgb(255, 219, 102)",
      "hillshade-exaggeration": 0.9
    }
  }, 'contour-line'); // Specifying the beforeId option to add new layer behind 'contour-line' layer
});

// Scale
const scale = new mapboxgl.ScaleControl({
  maxWidth: 150, // maximum size of the scale bar
  unit: "metric"
});
map.addControl(scale);

// RESET VIEW BUTTON
// Creating a new object for the reset button
const resetViewControl =  (initbounds) => ({
	// Define a new method for the object: onAdd method to create the button
	onAdd: function(map) {
		this.map = map;
		this.initbounds = initbounds;
		// Create the button
		this.container = document.createElement("button");
		this.container.className = "mapboxgl-ctrl-icon mapboxgl-ctrl-reset";
    this.container.type = "button";
    this.container.title = "Reset View"; // Tooltip on hover
		// Add an icon
		this.container.innerHTML = "⟲";
		// When clicked, reset the map view
    this.container.onclick = () => {
      this.map.fitBounds(initbounds);
    };
		// Locating the already existing navigation controller to place the new button right below them. Specifying a delay for it in case the control has not been loaded yet
		setTimeout(() => {
			const navControlGroup = document.querySelector(".mapboxgl-ctrl-top-right .mapboxgl-ctrl-group");
			if (navControlGroup) {
				navControlGroup.appendChild(this.container);
			} else {
				console.warn(".mapboxgl-ctrl-group not found!");
				return this.container;
			}
		}, 500); // Delay amount
		return this.container;
	},
});

// Adding the navigation buttons, without the map rotation button
map.addControl(new mapboxgl.NavigationControl({
  showCompass: false
}), 'top-right');

// Using the defined function to ass the reset view button to the map
map.addControl(resetViewControl(initbounds));

// FUNCTION FOR LOADING THE CORRECT DATASET 
function dataload(map, data_url, source_layer) {
	function datadefine() {
		// Scaling symbology based on zoom level and data values
		let paint_att = {
			'circle-radius': [
				'interpolate', ['linear'],
				['zoom'], // attribute to take into account, followed by the breakpoints
				3, [ // first breakpoint value of the attribute
					'interpolate', ['linear'], // nested interpolation based on data values
					['to-number', ['get', `${maindata}`]], // data value
					1, 0, // first nested breakpoint
					55, 5,
				],
				6, [
					'interpolate', ['linear'],
					['to-number', ['get', `${maindata}`]],
					1, 2,
					55, 18,
				],
				12, [
					'interpolate', ['linear'],
					['to-number', ['get', `${maindata}`]],
					1, 8,
					55, 32,
				]
			],
			'circle-color': `${datacolor}`,
			'circle-opacity': 0.8
		};
		// Remove data source and layer if exist but not for the current option
		if (map.getSource('stationsource')) {
			const prev_layer = map.getLayer('stationlayer');
			if (prev_layer['source-layer'] !== source_layer) {
				map.removeLayer("stationlayer");
				map.removeSource("stationsource");
			}
		};
		// Add data source and layer if it does not exist
		if (!map.getSource('stationsource')) {
			map.addSource('stationsource', {
						type: 'vector',
						url: `mapbox://${data_url}`
			});
			map.addLayer({
				id: 'stationlayer',
				type: 'circle',
				source: 'stationsource',
				'source-layer': source_layer,
				// Symbolizing the points based on the number of months
				paint: paint_att
			}, 'country-label'); // Place the layer behind the country labels
		};
		// Filtering if necessary
		const selection = document.querySelector('input[name="radio"]:checked'); //Selectiong the radio button that is checked
		if (selection.id.includes("byyear")) { //If the selected button's id contains byyear
			const filterYear = ['==', ['get', '1871'], '1'];
			map.setFilter('stationlayer', ['all', filterYear]);
		};
	} // datadefine function closed
	// Check if the map style is loaded
  if (map.isStyleLoaded()) { // If style is already loaded, proceed to loading the station layer
    datadefine();
  } else { // If style is not yet loaded, it will wait for it to load, and only load data afterwards. This will only happen once (when loading the page)
    map.once('load', datadefine);
  }
};

// FUNCTION FOR HOVERING INTERACTION
function hovering(map){
	map.on('load', () => {
		// Creatin a popup, but not adding it to the map yet
		const popup = new mapboxgl.Popup({
			closeButton: false,
			closeOnClick: false,
			offset: [0, -5],
			className: "popup",
		});
		// Creating event listener for the popup
		map.on('mousemove', 'stationlayer', (event) => {
			// Get the current station's information
			const stations = map.queryRenderedFeatures(event.point, {
				layers: ["stationlayer"]
			});
			const newid = stations[0].properties.nr_maindoc;
			// Getting the main data attribute (how many years), converted to numeric
			maindataval = Number(stations[0].properties[`${maindata}`]);
			// Build the popup information with methods and template literals
			popup.setLngLat(stations[0].geometry.coordinates) // Set the location of the popup to the station's coordinates
				.setHTML(
				//Add information to the popup
				`<h3><b>${stations[0].properties.name_nat}</b></h3>
				<h4>${stations[0].properties[maindata]} years</h4>`
				)	
				.addTo(map); // Add the popup to the map.
			// Add a hovering highlight layer for the current station (if it doesn't exist already for the exact same stations)
			if (map.getLayer('hoveroutline')) {
				const hoveredfeat = map.queryRenderedFeatures({
					layers: ['hoveroutline']
				});
				if (hoveredfeat[0].properties.nr_maindoc !== newid) {
					map.removeLayer('hoveroutline');
					map.removeSource('hover');
				}
			}
			if (!map.getLayer('hoveroutline')) {
				map.addSource("hover", {
					type: "geojson",
					data: { 
						type: "FeatureCollection", 
						features: stations.map(function (f) { //The map() function is used to transform the stations array into an array of GeoJSON features. ??
							return { 
								type: "Feature", 
								geometry: f.geometry,
								properties: {
									nr_maindoc: f.properties.nr_maindoc
								}
							};
						}) 
					}
				});
				map.addLayer({
					id: "hoveroutline",
					type: "circle",
					source: "hover",
					layout: {},
					paint: { // Define symbol sizes for hovering outline the same way as for the data points, but with slightly higher values
						"circle-radius":[
							'interpolate', ['linear'],
							['zoom'],
							3, [
									'interpolate', ['linear'],
									maindataval,
									1, 3,
									55, 8
							],
							6, [
									'interpolate', ['linear'],
									maindataval,
									1, 5,
									55, 21
							],
							12, [
									'interpolate', ['linear'],
									maindataval,
									1, 11,
									55, 35
							]
						],
						"circle-color": "rgb(0, 0, 0)",
						"circle-opacity": 0.8,
					}
				}, 'stationlayer'); // placing it behind the station layer
			}
		});
		map.on('mouseleave', 'stationlayer', () => {
			popup.remove();
			map.removeLayer('hoveroutline');
    	map.removeSource('hover');
		});
	});
};

// FUNCTIONS FOR TIME SLIDER INTERACTION
// Formatting the timeslider to place the pin and update the value correctly
function setlabel(slider){
	const slidLabel = document.getElementById("slidLabel");
	//Calculating the thumb's position on the slider (as a percentage), taking the pin's width into account
	const newLabel = Number((slider.value - slider.min) * 100 / (slider.max - slider.min));
	const labelPos = 12.5 - newLabel * 0.25;
	slidLabel.innerHTML = `<span>${slider.value}</span>`;
	slidLabel.style.left = `calc(${newLabel}% + (${labelPos}px))`
};

//Function to filter data based on the value on the timeslider. Default value (before any click is made) is 1871, specified in html
function timeslider(map, slider){
	//For every new click on the slider:
	slider.addEventListener('input', (event) => {
		//Get the new year value from the slider
		const year = parseInt(event.target.value);
		const syear = year.toString();
		//Create a filter
		filterYear = ['==', ['get', `${syear}`], '1'];
		//set the map filter
		map.setFilter('stationlayer', ['all', filterYear]);
		//Update the position and label for every new input
		setlabel(slider);
	});
};

// FUNCTION FOR CLICK INTERACTION
function onclick(){
	// Event listener for every click on the map
	map.on("click", (event) => {
		const stations = map.queryRenderedFeatures(event.point, {
    	layers: ["stationlayer"]
  	});
		// If click was made on a station
		if (stations.length > 0) {
			if (map.getLayer('clickedoutline')) {
  			map.removeLayer('clickedoutline');
    		map.removeSource('clicked');
			}
			document.getElementById("click").innerHTML =
				`<h2>${stations[0].properties.name_nat}</h2>
				 <h3>Country</h3>
				 <h4>${stations[0].properties.country}</h4>
				 <h3>${maindatatx} Data</h3>
				 <h4>${stations[0].properties[maindata]} years</h4>
				 <h3>Name in Yearbooks</h3>
				 <h4>${stations[0].properties.name_yb}</h4>
				 `
			// Getting the main data attribute (how many years), converted to numeric
			maindataval = Number(stations[0].properties[`${maindata}`]);
			// Adding a highlight layer similar to the hovering highlight, but this one will stay until something else is clicked on
			map.addSource("clicked", {
				type: "geojson",
				data: { 
					type: "FeatureCollection", 
					features: stations.map(function (f) {
						return { type: "Feature", geometry: f.geometry };
					}) 
				}
			});
			map.addLayer({
				id: "clickedoutline",
				type: "circle",
				source: "clicked",
				layout: {},
				paint: {
					"circle-radius": [
							'interpolate', ['linear'],
							['zoom'],
							3, [
									'interpolate', ['linear'],
									maindataval,
									1, 3,
									55, 8
							],
							6, [
									'interpolate', ['linear'],
									maindataval,
									1, 5,
									55, 21
							],
							12, [
									'interpolate', ['linear'],
									maindataval,
									1, 11,
									55, 35
							]
						],
					"circle-color": "rgb(0, 0, 0)",
				}
			}, 'stationlayer'); // placing it behind station layer
		}
		else {
			document.getElementById("click").innerHTML = 
				`<h2>Station Data</h2>
				 <h6>(For more information,<br>click on a station.)</h6>`
			if (map.getLayer('clickedoutline')) {
				map.removeLayer('clickedoutline');
    		map.removeSource('clicked');
			}
		};
	});
};

// LOADING DATA FOR DEFAULT OPTION, ADDING HOVERING INTERACTION
dataload(map, data_url, source_layer);
hovering(map, maindata);
onclick();

// SWITCHING BETWEEN THE THREE OPTIONS
// Getting the selected option value from the menu
const layerList = document.getElementById("menu");
const inputs = layerList.getElementsByTagName("input");

// Repetative cycle, repeated for each option switch
for (const input of inputs) {
  input.onclick = (layer) => {
		// Remove click highlight if a station was selected
		if (map.getLayer('clickedoutline')) {
  			map.removeLayer('clickedoutline');
    		map.removeSource('clicked');
		}
		// Fit the bounds to default extent
		map.fitBounds(initbounds);
		
		// Overview Option
    if (layer.target.id == "allyear") {
			document.getElementById('console').style.display = "none";
			// Option-specific variables
			data_url = "cilu.cm5pi8yes3ly81no72vkow5ac-622i2"; // Tileset ID
			source_layer = "stations_overview"; // Source layer name within tileset
			maindata = 'data_count'; // Main attribute name
			maindatatx = ''; // Main attribute name as text
			datacolor = "rgb(110, 24, 41)"; // Color for symbols
			
			dataload(map, data_url, source_layer); // Calling the data loading function with correct arguments
		}
    else {
			// Make the console visible for the two more specific options
			document.getElementById('console').style.display = "block";
			// Temperature Option
			if (layer.target.id == "byyear_t") {
				// Option-specific variables
				data_url = "cilu.cm5pigjyi3drw1nrxiol14935-3d50y";
				source_layer = "stations_temp";
				maindata = 'temp_count';
				maindatatx = 'Temperature';
				datacolor = "rgb(145, 66, 10)";
			}
			// Precipitation Option
			else if (layer.target.id == "byyear_p") {
				// Option-specific variables
				data_url = "cilu.cm5pvteku0cgv1ory0bhaszzb-40bch";
				source_layer = "stations_prec";
				maindata = 'prec_count';
				maindatatx = 'Precipitation';
				datacolor = "rgb(33, 95, 105)";
			}
			else {console.log("undefined cathegory")};
			// Calling the data loading function with correct arguments for the last two options
			dataload(map, data_url, source_layer);
			// Reset slider to default value (1871) and update the slider label
			const slider = document.getElementById("slider");
			slider.value = 1871;
			setlabel(slider);
			// Calling the timeslider interaction function
			timeslider(map, slider);
		}
		// Calling interaction functions for all three options
		hovering(map, maindata);
		onclick();
  }
}