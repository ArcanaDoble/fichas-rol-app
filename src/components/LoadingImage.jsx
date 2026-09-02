import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const decodedImageSources = new Set();

const LoadingImage = ({
  src,
  alt = '',
  imageClassName = '',
  skeletonClassName = '',
  skeleton = true,
  showFailureFallback = true,
  ...imageProps
}) => {
  const [loaded, setLoaded] = useState(() => Boolean(src && decodedImageSources.has(src)));
  const [failed, setFailed] = useState(false);
  const imageRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current += 1;
    const requestId = requestRef.current;
    setLoaded(Boolean(src && decodedImageSources.has(src)));
    setFailed(false);

    if (src && decodedImageSources.has(src)) return undefined;

    const image = imageRef.current;
    if (!src || !image?.complete) return undefined;
    if (!image.naturalWidth) {
      setFailed(true);
      return undefined;
    }

    const reveal = () => {
      if (requestRef.current === requestId) {
        decodedImageSources.add(src);
        setFailed(false);
        setLoaded(true);
      }
    };

    if (typeof image.decode === 'function') {
      image.decode().then(reveal).catch(reveal);
    } else {
      reveal();
    }

    return undefined;
  }, [src]);

  const handleLoad = async (event) => {
    const requestId = requestRef.current;
    const image = event.currentTarget;
    if (typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch (error) {
        // The browser can still display a completed image when decode is interrupted.
      }
    }
    if (requestRef.current === requestId) {
      decodedImageSources.add(src);
      setFailed(false);
      setLoaded(true);
    }
    imageProps.onLoad?.(event);
  };

  return (
    <>
      {skeleton && !loaded && !failed && (
        <div
          className={`absolute inset-0 z-0 bg-[#111827] ${skeletonClassName}`}
          aria-hidden="true"
        />
      )}

      {failed && showFailureFallback ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0b1120] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Sin imagen
        </div>
      ) : null}

      {src ? (
        <img
          {...imageProps}
          ref={imageRef}
          src={src}
          alt={alt}
          decoding={imageProps.decoding || 'async'}
          onLoad={handleLoad}
          onError={(event) => {
            setFailed(true);
            imageProps.onError?.(event);
          }}
          style={{
            ...imageProps.style,
            opacity: loaded ? imageProps.style?.opacity : 0,
          }}
          className={`block transition-opacity duration-500 ${imageClassName}`}
        />
      ) : null}
    </>
  );
};

LoadingImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  imageClassName: PropTypes.string,
  skeletonClassName: PropTypes.string,
  skeleton: PropTypes.bool,
  showFailureFallback: PropTypes.bool,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
};

export default LoadingImage;
