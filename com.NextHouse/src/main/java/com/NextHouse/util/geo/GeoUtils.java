package com.NextHouse.util.geo;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

/**
 * Utility for constructing JTS Point objects compatible with PostGIS
 * geography(Point, 4326) columns.
 *
 * SRID 4326 = WGS84 — the same coordinate system GPS uses.
 * JTS stores coordinates as (X=longitude, Y=latitude) — note the order.
 *
 * Usage:
 *   Point p = geoUtils.buildPoint(3.1390, 101.6869); // KL
 *   entity.setLocation(p);
 */
@Component
public class GeoUtils {

    // SRID 4326 = WGS84 geographic coordinate system
    private static final int SRID = 4326;

    private final GeometryFactory geometryFactory =
            new GeometryFactory(new PrecisionModel(), SRID);

    /**
     * Build a PostGIS-compatible Point from latitude and longitude.
     *
     * @param latitude   Y axis (-90 to 90)
     * @param longitude  X axis (-180 to 180)
     */
    public Point buildPoint(double latitude, double longitude) {
        // JTS Coordinate: (x = longitude, y = latitude)
        Coordinate coordinate = new Coordinate(longitude, latitude);
        Point point = geometryFactory.createPoint(coordinate);
        point.setSRID(SRID);
        return point;
    }

    public Point buildPointOrNull(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) return null;
        return buildPoint(latitude, longitude);
    }

    /**
     * Rough bounding-box check before making a DB geo query.
     * Returns true if lat/lon values are plausible GPS coordinates.
     */
    public boolean isValidCoordinate(double latitude, double longitude) {
        return latitude >= -90 && latitude <= 90
            && longitude >= -180 && longitude <= 180;
    }
}
